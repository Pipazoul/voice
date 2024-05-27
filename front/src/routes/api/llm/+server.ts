
import { env } from '$env/dynamic/private'
import { json } from '@sveltejs/kit';

const hfToken = env.PRIVATE_HF_TOKEN;

export const POST = async ({request}) =>  {
    let {context} = await request.json();
    console.log(context);
    const systemMsg = context[0];
    // limit the number of messages to but kee the fir
    if (context.length > 5) {
        context = context.slice(0, 5);
        // add on top of array
        context.unshift(systemMsg);

    }

    const data = {
        "model": "llama3",
        "messages": context,
        "stream": false,
    };

    const response = await fetch('http://192.168.1.98:11434/api/chat', {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
    });
    const req = await response.json();

    const assistantMessage = req;
    return json(assistantMessage);
}    