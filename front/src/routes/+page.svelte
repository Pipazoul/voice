<script lang="ts">
    import { onMount } from 'svelte';
    import { env } from '$env/dynamic/public';

    let hfToken = env.HF_TOKEN || '';

    let audioContext;
    let mediaRecorder;
    let audioChunks = [];
    let recording = false;
    let audioUrl = '';
    let silenceCounter = 0;

    let average = 0;
    let threshold = 20;

    let talkedOnce = false;
    let silenceDelay = 700; // 500ms delay for final silence detection

    let context: any[] = [
        {
            "role": 'system',
            "content": "Your are Damien a french speaking asssistant, you only speak in french and make short sentences"
        }
    ];

    async function startRecording() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await audioContext.resume(); // Ensure the AudioContext is active
        }
        recording = true;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioInput = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        audioInput.connect(analyser);
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            audioUrl = URL.createObjectURL(audioBlob);
            audioChunks = []; // Clear the old chunks
            const audioBase64 = await blobToBase64(audioBlob);
            const transcript = await transcribe(audioBase64);
            console.log(transcript);
            context = [...context, {
                "role": 'user',
                "content": transcript
            }];
            console.log("just before llm", context)
            const llmResponse = await llm(context);
            console.log("llm response",llmResponse);
            context = [...context, llmResponse.message]
            console.log(context);
            const ttsData = await tts(llmResponse.message.content);
            playAudio(ttsData);
            audioUrl = '';
        };
        mediaRecorder.start();
        checkAudioLevel(analyser, stream);
    }

    function playAudio(base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.play();
        audio.onplaying = () => {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                const audioInput = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                audioInput.connect(analyser);
                checkInterruption(analyser, audio);
            });
        };
        audio.onpause = () => {
            // Resume recording if the audio is paused due to an interruption
            startRecording();
        };
    }

    function checkInterruption(analyser, audio) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        function analyse() {
            analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((acc, value) => acc + value, 0);
            const currentAverage = sum / dataArray.length;
            if (currentAverage > threshold) {
                audio.pause(); // This will trigger the onpause event, which restarts the recording
            }
            requestAnimationFrame(analyse);
        }
        analyse();
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
                let base64String = reader.result.replace(/^data:.+;base64,/, '');
                resolve(base64String);
            };
            reader.readAsDataURL(blob);
        });
    }

    function checkAudioLevel(analyser, stream) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const bufferLength = audioContext.sampleRate / dataArray.length; // Buffer size for 1 second of audio levels
    const levelBuffer = [];

    function analyse() {
        if (!recording) return;
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, value) => acc + value, 0);
        const currentAverage = sum / dataArray.length;
        levelBuffer.push(currentAverage);

        // Maintain a buffer of the last second's audio levels
        if (levelBuffer.length > bufferLength) {
            levelBuffer.shift(); // Remove the oldest value
        }

        // Check if all values in the buffer are below the threshold
        const isBelowThreshold = levelBuffer.every(value => value < threshold);

        if (isBelowThreshold && recording && talkedOnce) {
            setTimeout(() => {
                // Double-check if it's still below threshold
                if (levelBuffer.every(value => value < threshold) && recording) {
                    stopRecording();
                }
            }, silenceDelay);
        } else {
            talkedOnce = true;
        }
        requestAnimationFrame(analyse);
    }
    analyse();
}

  
    function stopRecording() {
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        recording = false;
    }
  
    async function transcribe(audioBase64: string) {
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audioBase64 }),
        });
        const data = await response.json();
        return data.segments;
    }

    async function tts(text: string) {
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });
        const data = await response.json();
        return data;
    }

    async function llm(context: any[]) {
        console.log("llm", context)
        const response = await fetch('/api/llm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ context }),
        });
        const data = await response.json();
        return data;
    }
</script>

<section>
    <button on:click={() => {throw new Error('Test error')}}>Throw error</button>
    <div>
        <h1>Audio Level</h1>
        <p>Current audio level: {average.toFixed(1)}</p>
    </div>
    <div>
        <h1>Threshold</h1>
        <input type="range" bind:value={threshold} min="0" max="255" />
        <p>Current threshold: {threshold}</p>
    </div>
    {#if audioUrl}
      <audio controls src={audioUrl} />
    {/if}
    {#if recording}
      <button on:click={stopRecording}>Stop Recording</button>
    {:else}
      <button on:click={startRecording}>Start Recording</button>
    {/if}
</section>
