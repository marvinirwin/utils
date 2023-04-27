import {
    askWithFiles,
    getModifications,
    getOptions,
    resolveFileBlobs,
    writeModificationsObject
} from "./lib/modifyFile.js";

export async function applyModifications() {
    const {argv, request, fileBlobs, ask} = getOptions();
    let p = {
        command: request,
        baseDir: argv.baseDir as string,
        inputFiles: await resolveFileBlobs(fileBlobs as string[])
    };

    if (ask) {
        console.log(await askWithFiles({
            question: request,
            inputFiles: p.inputFiles
        }))
        return;
    }
    const modifications = await getModifications(p);

    if (argv.printModifications || argv.pm) {
        console.log(modifications);
        return;
    }

    await writeModificationsObject(modifications);
}

applyModifications().catch(console.error);