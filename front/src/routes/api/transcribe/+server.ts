
import { env } from '$env/dynamic/private'
import { json } from '@sveltejs/kit';

const hfToken = env.PRIVATE_HF_TOKEN;

export const POST = async ({request}) =>  {
    const {audioBase64} = await request.json();
    const data = {
        "input": {
            "audio_base64": audioBase64,
            "language": "fr",
            "language_detection_min_prob": 0,
            "language_detection_max_tries": 5,
            "initial_prompt": "string",
            "align_output": false,
            "diarization": false,
            "huggingface_access_token": hfToken,
            "min_speakers": 1,
            "max_speakers": 1,
            "debug": false
        }
    };

    const response = await fetch('http://192.168.1.98:4001/predictions', {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
    });
    const text = await response.json();
    const segments = text.output.segments[0].text;

    return json({segments});
    
}    