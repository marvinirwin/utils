import {config} from 'dotenv';
import {ChatGPTAPI} from "chatgpt";
import fs from "fs";


config();

const api = new ChatGPTAPI({
    apiKey: process.env.OPENAI_API_KEY as string,
    completionParams: { model: 'gpt-4' },
    maxModelTokens: 8100 // not 8192 because we're leaving some buffer room
});

const cacheFile = './chatgpt-cache.json';
const cache = fs.existsSync(cacheFile)
    ? JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
    : {};

export const getChatGPTResult = async (prompt: string): Promise<string> => {
    if (cache[prompt]) {
        return cache[prompt];
    }

    return await api
        .sendMessage(prompt )
        .then((response) => {
            let text = response.text /*response.data.choices[0].text*/ as string;

            // Save the result in the cache and store it in a JSON file
            cache[prompt] = text;
            fs.writeFileSync(cacheFile, JSON.stringify(cache));

            return text;
        })
        .catch((e) => {
            console.log(prompt);
            console.error(e);
            throw e.response.data;
        });
};







