import { walk } from "https://deno.land/std@0.201.0/fs/walk.ts";

import * as path from "https://deno.land/std@0.201.0/path/mod.ts";
import { Semaphore } from "https://deno.land/x/semaphore@v1.1.2/semaphore.ts";



const mutex = new Semaphore(1);
const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

const repoDir = path.join(__dirname, '..');
const entries = walk(new URL('../backup', import.meta.url), { match: [/\d{10}-/] });

const TEN_DAY = 10 * 24 * 60 * 60;

const now = Math.floor(Date.now() / 1000);

for await (const entry of entries) {
    const time = entry.name.match(/(^\d+)-/)?.[1]
    if (!time) {
        continue;
    }
    const timeDiff = now - Number(time);

    if (timeDiff > TEN_DAY) {
        try {
            mutex.use(() => {
                deleteFileInGitHistory(entry.path)
                return Promise.resolve()
            })
        } catch (err) {
            if (!(err instanceof Deno.errors.NotFound)) {
                throw err;
            }
        }
    }
}

// function delete
function deleteFileInGitHistory(path: string) {
    const command = new Deno.Command(new URL('./git-filter-repo', import.meta.url), {
        args: ['--force', '--invert-paths', '--path', path.replace(`${repoDir}/`, '')],
    });
    command.spawn()

}