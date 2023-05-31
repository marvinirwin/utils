import fs from 'fs';
import {getChatGPTResult} from "./lib.js";
import {JsonTypescriptPromptEnd, JsonTypescriptPromptInputTypeStart, resolveFileAndContents} from "./lib/modifyFile.js";

type RefactorRequestReturType = { writes: { path: string, contents: string }[] };
const refactor = async (filePath: string, refactorRequest: string) => {
    let chatGPTResult = await getChatGPTResult(`
    
You are an API which takes as input a file and its contents as well as instructions for refactoring that file.  You then return a list of writes to the filesystem to accomplish that refactor.

${JsonTypescriptPromptInputTypeStart}

interface Input {
    filePath: string;
    fileContents: string;
    refactorRequest
}

interface ApiResult {
    writes: {
        path: string;
        contents: string;
    }
}

${JsonTypescriptPromptEnd}

${JSON.stringify({filePath, fileContents: fs.readFileSync(filePath), refactorRequest})}
    `);
    console.log(chatGPTResult)
    return JSON.parse(chatGPTResult) as RefactorRequestReturType
}

// Define the function to prompt the user on the command line
function promptUser() {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    console.log('Were the changes good or bad? (Enter "good" or "bad")');
    process.stdin.on('data', (data) => {
        const input = data.toString('utf-8').trim().toLowerCase();
        if (input === 'good') {
            console.log('Changes were successful!');
        } else if (input === 'bad') {
            console.log('Changes were unsuccessful.');
        } else {
            console.log('Invalid input. Please enter "good" or "bad".');
        }
        process.exit();
    });
}

// Define the main function that applies the refactoring changes
async function main(filePath: string, refactoringText: string) {
    try {
        // Call the `refactor` function with the file contents and refactoring text
        const refactorResults = await refactor(filePath, refactoringText);

        // Apply the changes to the file system
        refactorResults.writes.forEach(({ path, contents }) => {
            fs.writeFileSync(path, contents, 'utf-8');
        });

        // Prompt the user to indicate whether the changes were good or bad
        promptUser();
    } catch (error) {
        // @ts-ignore
        console.error(`Error: ${error.message}`);
    }
}

// Call the main function with the command line arguments
main(process.argv[2], process.argv[3]);