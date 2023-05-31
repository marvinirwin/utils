import {getChatGPTResult} from "./lib.js";
import clipboardy from "clipboardy";


(async () => {
    let prompt = process.argv[2];
    if (!prompt) {
        console.log(`No command line prompt provided, taking one from the clipboard`)
        prompt = await clipboardy.read();
        console.log(prompt)
    }
        getChatGPTResult(prompt).then(async (result) => {
            console.log(result);
            await clipboardy.write(result)
        })
})();