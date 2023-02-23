import fetch from 'node-fetch';
import playSound from 'play-sound';
import * as fs from "fs";
import {config} from 'dotenv';
import {join} from 'path';
config();
import prompt from 'prompt';
import {getChatGPTResult} from "./lib.js";
import notifier from 'node-notifier';


const leeKuanYewVoiceId = '8Fg13Xuy48MjwYUkNSC2';
const SOUND_FOLDER = '/sounds';
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY as string;
const fetchAndPlayVoice = async ({voice_id, text}: { voice_id: string, text: string }) => {
    const body = {text};
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
        method: 'post',
        body: JSON.stringify({
            ...body,
            "voice_settings": {
                "stability": 0,
                "similarity_boost": 0
            }
        }),
        headers: {
            'xi-api-key': ELEVEN_API_KEY,
            'content-type': 'application/json'
        }
    });
    const buffer = await response.arrayBuffer();
    const file = `${voice_id}-${text.split(' ').join('-')}.mpeg`;
    if (!fs.existsSync(SOUND_FOLDER)) {
        fs.mkdirSync(SOUND_FOLDER);
    }
    fs.writeFileSync(join(SOUND_FOLDER,file), Buffer.from(buffer))
    playSound().play(file);
}

prompt.start();
(
    async () => {
        const {steps} = await prompt.get(['steps']);
        const result = await getChatGPTResult(`${steps}. Format your response in a valid JSON array where the elements are strings representing each step.`);
        // @ts-ignore
        const stepsArray = JSON.parse(result.data.choices[0].text as string);
        for (const step of stepsArray) {
            let stepPassed = false;
            while (!stepPassed) {
                await fetchAndPlayVoice({voice_id: leeKuanYewVoiceId, text: step});
                console.log(step);
                notifier.notify({
                    title: 'Next Step',
                    message: step
                })
                const {passed} = await prompt.get(['passed']);
                stepPassed = passed === 'y';
            }
        }

    }
)();




