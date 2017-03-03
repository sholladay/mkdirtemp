import path from 'path';
import fs from 'fs';
import os from 'os';
import test from 'ava';
import mkdirtemp from '.';

test('mkdirtemp() basics', async (t) => {
    const osTempDir = os.tmpdir();
    const dirPath = await mkdirtemp();
    t.is(typeof dirPath, 'string');
    t.truthy(dirPath);
    t.true(dirPath.length > 6);
    t.true(dirPath.includes(path.sep));
    t.true(path.isAbsolute(dirPath));

    t.true(dirPath.startsWith(path.join(osTempDir, path.sep)));
    t.is(dirPath.substring(0, dirPath.length - 6), osTempDir + path.sep);
    const lastSep = dirPath.lastIndexOf(path.sep);
    const rest = dirPath.substring(lastSep);
    t.is(rest.length, 7);
    t.is(dirPath.length - osTempDir.length, 7);
});

test('filesystem properties', async (t) => {
    const date = Math.trunc(Date.now() / 1000);
    const dirPath = await mkdirtemp();
    // Node < 6.3 exposes constants directly on the module.
    const perm = fs.constants || fs;

    await t.notThrows(new Promise((resolve, reject) => {
        // eslint-disable-next-line no-bitwise
        fs.access(dirPath, perm.R_OK | perm.W_OK | perm.X_OK, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    }));

    const status = await new Promise((resolve, reject) => {
        fs.lstat(dirPath, (err, stat) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(stat);
        });
    });

    t.false(status.isFile());
    t.false(status.isSymbolicLink());
    t.true(status.isDirectory());

    t.is(status.uid, process.getuid());
    t.is(status.gid, process.getgid());
    // Verify permissions are 0700.
    t.is(status.mode, 16832);

    // The status times seem to lack subsecond precision - milliseconds are always zero.
    t.true(date <= Math.trunc(status.atime.getTime() / 1000));
    t.true(date <= Math.trunc(status.mtime.getTime() / 1000));
    t.true(date <= Math.trunc(status.ctime.getTime() / 1000));
    t.true(date <= Math.trunc(status.birthtime.getTime() / 1000));
});
