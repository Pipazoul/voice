
import { env } from '$env/dynamic/private'
import { json } from '@sveltejs/kit';

const hfToken = env.PRIVATE_HF_TOKEN;

export const POST = async ({request}) =>  {
    const {text} = await request.json();
    // timestamp
    const timestamp = new Date().toISOString();
    const data = {
        "input": {
            "episode_id":timestamp,
            "text": text,
            "lang": "fr",
            "voice": "tom"
        }
    };

    const response = await fetch('http://192.168.1.98:4002/predictions', {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
    });
    const req = await response.json();
    const audio= req.output
    console.log(req.input);

    return json(audio);
    
}    