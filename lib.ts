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
export const getChatGPTResult = async (prompt: string) => {
    const length = encode(prompt).length;
    console.log(length)
    return await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        max_tokens: maxTokens - length,
        temperature: 0.5,
    })
        .then(response => response.data.choices[0].text)
        .catch(e => {
            console.log(prompt.length);
            console.error(e.response.data);
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





