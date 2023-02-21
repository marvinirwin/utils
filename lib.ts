import {config} from 'dotenv';
config();
import {Configuration, OpenAIApi} from "openai";

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const getChatGPTResult = async (prompt: string) => {
    const axiosResponse = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        max_tokens: 4096 - prompt.length,
        temperature: 0.5,
    });
    return axiosResponse;
};



