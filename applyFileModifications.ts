import {getModifications, resolveFileBlobs, writeModificationsObject} from "./lib/modifyFile.js";
import yargs from "yargs";

export async function applyModifications() {
    const argv = yargs(process.argv.slice(2))
        .option('print-modifications',
            {
                alias: 'pm',
                type: 'boolean',
                description: 'Print modifications'
            })
        .option('request',
            {
                alias: 'r',
                type: 'string',
                demandOption: true,
                description: 'Request command'
            })
        .parseSync();

    const request = argv.request;
    const fileBlobs = argv._ as string[];

    const modifications = await getModifications({
        command: request,
        inputFiles: await resolveFileBlobs(fileBlobs as string[])
    });

    if (argv.printModifications || argv.pm) {
        console.log(modifications);
        return;
    }

    await writeModificationsObject(modifications);
}

applyModifications().catch(console.error);