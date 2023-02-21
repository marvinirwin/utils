import {getChatGPTResult} from "./lib.js";

export const simplifyHskLevel = async (text: string, level: string) => {
    const result = await getChatGPTResult(`Please make the following Chinese text use as much grammar and vocabulary from HSK level ${level}.  
    Don't simplify the characters of any names, and also return a list of all characters by HSK level.  Return all results in JSON format,
    ${text}
    `);

    return JSON.parse(result.data.choices[0] as string);
}

const text = process.argv[2];
const level = process.argv[3];

simplifyHskLevel(text, level).then(result => console.log(result))