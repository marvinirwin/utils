import {config} from 'dotenv';
import {Configuration, OpenAIApi} from "openai";
import {encode} from 'gpt-3-encoder';


config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const maxTokens = 4096;
const conservativeMaxTokens = 2048;

import {ChatGPTAPI} from "chatgpt";

const api = new ChatGPTAPI({apiKey: process.env.OPENAI_API_KEY as string})
export const getChatGPTResult = async (prompt: string): Promise<string> => {
    return await api.sendMessage(prompt,/*{
        prompt: prompt,
        model: "text-davinci-003",
        max_tokens: maxTokens - length,
        temperature: 0.5,
    }*/)
        .then(response => {
            let text = response.text /*response.data.choices[0].text*/ as string;
            return text;
        })
        .catch(e => {
            console.log(prompt);
            console.error(e);
            throw e.response.data;
        })
};

function breakTextIntoChunks(text: string, sentenceBreakingChars: string[], maxLength: number) {
    const chunks = [];
    let start = 0;
    let end = 0;
    while (end < text.length) {
        end = start + maxLength;
        if (end >= text.length) {
            chunks.push(text.slice(start));
            break;
        }
        let lastBreakingCharIndex = -1;
        for (let i = end; i >= start; i--) {
            if (sentenceBreakingChars.includes(text[i])) {
                lastBreakingCharIndex = i;
                break;
            }
        }
        if (lastBreakingCharIndex !== -1) {
            chunks.push(text.slice(start, lastBreakingCharIndex + 1));
            start = lastBreakingCharIndex + 1;
        } else {
            chunks.push(text.slice(start, end));
            start = end;
        }
    }
    return chunks;
}

export const getChunkedChatGPTResults = async (prefix: string, content: string, resultToPromptRatio: number) => {
    const results = [];
    const chunkSize = 300;

    const chunks = breakTextIntoChunks(
        content,
        [
            '.',
            '?',
            '!',
            '，',
            '。',
            '！',
            '\n',
        ],
        chunkSize
    );

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const prompt = `${prefix}${chunk}`;
        const result = await getChatGPTResult(prompt);
        results.push({
            prompt,
            original: chunk,
            result
        })
    }
    return results;
}





