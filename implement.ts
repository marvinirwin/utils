import {
    FileCreation,
    FileDeletion,
    getModifications, JsonTypescriptPromptEnd,
    JsonTypescriptPromptInputTypeStart,
    JsonTypescriptPromptOutputTypeStart,
    JsonTypescriptPromptStart, Modification,
    resolveFileAndContents,
    resolveFileBlobs,
    writeModificationsObject
} from "./lib/modifyFile.js";
import {getChatGPTResult} from "./lib.js";

const description = `The simplest possible ios iphone swift app with UIKit views which has a screen for entering S3 credentials, bucket and a PostgresSQL database credentials and then another screen.  
    The second screen will have an input for a chinese character sentence.  
    When the user submits the sentence the screen then records a 60fps video.  
    When the user ends the video it then prompts the user to confirm the video is suitable.  
    If the video is suitable then the sound is played back at 0.25 speed while the user is shown each character in the sentence one by one and presses a button whenever they hear that character is being spoken.  
    Record the time of each button press relative to the start time of the sound clip.  
    The user can press R while recording character timings to restart the process.  
    Once character timing is completed, confirm with the user that the timings are correct and then upload the video to S3 as a .mov and upload the timing metadata to a postgresql database`;

// ModifyFunc signature based on your description
type ModifyFuncType = (filePath: string, instruction: any) => Promise<void>;

// Application description type
type ApplicationDescription = {
    // Add your application description properties here
};

// Design document type
type InputType = {
    designDocument: string;
    baseDir: string;
}

// Scaffolded file type
type ScaffoldedFile = {
    path: string;
    content: string;
};

// 1. Function to generate a design document from an application description
async function generateDesignDocument(description: ApplicationDescription): Promise<string> {
    // Implement logic to generate the design document
    const result = await getChatGPTResult(`Generate a software design document for the following app description:
    ${description}
    `)
    return result
}

// 2. Function to generate scaffolded files from a design document and a base directory
async function generateScaffoldedFiles(designDocument: string, baseDir: string): Promise<{scaffoldedFiles: ScaffoldedFile[]}> {
    const result = await getChatGPTResult(`
 
${JsonTypescriptPromptStart}

Your input is a design document and a base directory.
Your output should be the complete list of files required to run the project and, as well as scaffolded files with dummy function bodies.  
Unimplemented functions should have comment bodies which explain exactly what the function does.


Return the result in the format described by the Output type.  All new files should be created relative to the baseDir

${JsonTypescriptPromptInputTypeStart}
 
type Input = {
    designDocument: string;
    baseDir: string;
}

${JsonTypescriptPromptOutputTypeStart}

type ScaffoldedFile = {
    path: string;
    content: string;
};

type Output = {
  scaffoldedFiles: ScaffoldedFile[];
}

${JsonTypescriptPromptEnd}

${JSON.stringify({designDocument, baseDir})}

`);
    return JSON.parse(result);
}


// 3. Function to modify files according to the instructions in the scaffolded files using ModifyFunc
const modifyFiles = async (modifyFunc: ModifyFuncType, scaffoldedFiles: ScaffoldedFile[]): Promise<void> => {
    for (let i = 0; i < scaffoldedFiles.length; i++) {
        const scaffoldedFile = scaffoldedFiles[i];
        if (scaffoldedFile.path.endsWith('.plist')) {
            continue;
        }
        await modifyFunc(scaffoldedFile.path, `For the following code, replace every single comment (without exception) inside of a function body with a working implementation of the feature described in the comment.  Do not create extra files, only modify the input file.
        The code is Swift and UIKit and the application being implemented is the following: 
        ${description}`)
    }
};

// Main function that calls the three functions in series
async function main() {
    const appDescription: ApplicationDescription = `
    ${description}
    `;

    const baseDirectory = '/Users/marvinirwin/WebstormProjects/SentenceRecorder/SentenceRecorder';

    // Replace this with the actual ModifyFunc implementation
    const modifyFunc: ModifyFuncType = async (filePath, instruction) => {
        // Implement the ModifyFunc logic
        let newVar = await resolveFileAndContents(filePath);
        const modifications = await getModifications({
            command: instruction,
            baseDir: baseDirectory as string,
            inputFiles: [newVar]
        });
        console.log(`Got changes for ${filePath}: Modification count: ${modifications.modifications.length}, Creation count: ${modifications.creations.length}`)

        // Sometimes it still tries to create new files, which will not be implemented :(
        await writeModificationsObject({modifications: modifications.modifications, creations: [], deletions: []});
    };

    // Call the three functions in series
    try {
        const designDocument = await generateDesignDocument(appDescription);
        console.log(designDocument)
        const scaffoldedFiles = await generateScaffoldedFiles(designDocument, baseDirectory);
        await writeModificationsObject({
            modifications: [],
            deletions: [],
            creations: scaffoldedFiles.scaffoldedFiles
        })
        await modifyFiles(modifyFunc, scaffoldedFiles.scaffoldedFiles);
        console.log('All tasks completed successfully');
    } catch (error) {
        console.error('Error occurred:', error);
    }
}
main()

// Call the main function