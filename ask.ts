import {getChatGPTResult} from "./lib";

const prompt = process.argv[2];
getChatGPTResult(prompt).then((result) => {
    console.log(result.data.choices[0].text);
})