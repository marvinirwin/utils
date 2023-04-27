import * as readline from 'readline';
import {Configuration, CreateCompletionResponse, OpenAIApi} from 'openai';
import * as fs from 'fs';
import { AxiosResponse } from 'axios';
import {getChatGPTResult} from "./lib.js";


const promptUserForText = async (promptText: string): Promise<string> => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(promptText, (input: string) => {
            rl.close();
            resolve(input);
        });
    });
};

(async () => {
    const filename = await promptUserForText("What file would you like to add to?")
    while (true) {
        let promptIsGood;
        let promptText
        let chatGPTResult
        do {
            promptText = await promptUserForText('Prompt: ');
            chatGPTResult = await getChatGPTResult(promptText);
            console.log(chatGPTResult)
            promptIsGood = (await promptUserForText('Is this sufficient? (y/n)')) === 'y';
        } while (!promptIsGood)
        console.log('appending to file');
        //ts-ignore
        fs.appendFileSync(filename, chatGPTResult.data.choices[0].text || "");
        eval(fs.readFileSync(filename).toString());
    }
})();
