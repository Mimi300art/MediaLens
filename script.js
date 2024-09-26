const fileInput = document.getElementById('fileInput');
const mediaPreview = document.getElementById('mediaPreview');
const analyzeBtn = document.getElementById('analyzeBtn');
const status = document.getElementById('status');
const mediaTypeSelect = document.getElementById('mediaType');
const userInstructions = document.getElementById('userInstructions');

const BASE_URL = ''; // Replace with your base URL
const GOOGLE_API_KEY = ''; // Replace with your API key


let selectedFiles = [];

fileInput.addEventListener('change', handleFileSelection);

analyzeBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
        alert('Please upload media files to analyze.');
        return;
    }

    const instructions = userInstructions.value.trim();
    if (!instructions) {
        alert('Please provide instructions.');
        return;
    }

    status.textContent = 'Analyzing...';

    try {
        //const fileData = await uploadFiles(selectedFiles);
        const result = await analyzeMedia(instructions);
        status.textContent = `Analysis result: ${result}`;
    } catch (error) {
            status.textContent = 'Error analyzing the media.';
            console.error('Error:', error);
    }
});

function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    mediaPreview.innerHTML = '';
    selectedFiles = files;

    files.forEach(file => {
        const fileURL = URL.createObjectURL(file);
        let mediaElement;

        if (file.type.startsWith('image/')) {
            mediaElement = document.createElement('img');
            mediaElement.src = fileURL;

          
        
        } else if (file.type === 'application/pdf') {
            mediaElement = document.createElement('div');
             mediaElement = document.createElement('txt');
             mediaElement.src = fileURL;
             mediaElement.controls = true;
             mediaElement.innerHTML = `
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="100" viewBox="0 0 24 24"  margin-top="-50 px"fill="white" style="vertical-align: top;">
                    <path d="M3 4H13C13.5523 4 14 4.44772 14 5V19C14 19.5523 13.5523 20 13 20H3C2.44772 20 2 19.5523 2 19V5C2 4.44772 2.44772 4 3 4ZM15 5.5C15 4.67157 15.6716 4 16.5 4H21C21.5523 4 22 4.44772 22 5V19C22 19.5523 21.5523 20 21 20H16.5C15.6716 20 15 19.3284 15 18.5V5.5ZM4 6V18H12V6H4ZM16 6V18H20V6H16Z"/>
                </svg>
                <embed src="${fileURL}" type="application/pdf" width="100%" height="500px"/>
             `;

         } else if (file.type === 'application/excel') {
            mediaElement = document.createElement('div');
                mediaElement = document.createElement('txt');
                mediaElement.src = fileURL;
                mediaElement.controls = true;
                mediaElement.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="30" viewBox="0 0 24 24" fill="white" style="vertical-align: middle;">
                       <path d="M3 4H13C13.5523 4 14 4.44772 14 5V19C14 19.5523 13.5523 20 13 20H3C2.44772 20 2 19.5523 2 19V5C2 4.44772 2.44772 4 3 4ZM15 5.5C15 4.67157 15.6716 4 16.5 4H21C21.5523 4 22 4.44772 22 5V19C22 19.5523 21.5523 20 21 20H16.5C15.6716 20 15 19.3284 15 18.5V5.5ZM4 6V18H12V6H4ZM16 6V18H20V6H16Z"/>
                   </svg>
                   <embed src="${fileURL}" type="application/excel" width="100%" height="500px"/>
                `;
                
        } else if (file.type.startsWith('video/')) {
            mediaElement = document.createElement('video');
            mediaElement.src = fileURL;
            mediaElement.controls = true;
        }

        mediaPreview.appendChild(mediaElement);
    });
}

async function analyzeMedia(instructions) {
    // Get image MIME type and size
    const file = document.getElementById('fileInput').files[0];
    const mimeType = file.type;
    const numBytes = file.size;
    const displayName = file.name;

    // Initial resumable request
    const response1 = await fetch(`${BASE_URL}/upload/v1beta/files?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': numBytes,
            'X-Goog-Upload-Header-Content-Type': mimeType,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { display_name: displayName } }),
    });

    const uploadUrl = response1.headers.get('X-Goog-Upload-Url');

    // Upload the actual bytes
    const response2 = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Length': numBytes,
            'X-Goog-Upload-Offset': 0,
            'X-Goog-Upload-Command': 'upload, finalize',
        },
        body: file,
    });

    const fileInfo = await response2.json();
    console.log(fileInfo)
    const fileUri = fileInfo.file.uri;
    let state = fileInfo.file.state;

    // Step 3: Poll file state until it's ACTIVE
    while (state === 'PROCESSING') {
        console.log('Processing file...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds

        // Fetch the current state of the file
        const fileStatusResponse = await fetch(`${fileUri}?key=${GOOGLE_API_KEY}`);
        const fileStatusData = await fileStatusResponse.json();
        console.log(fileStatusData);
        state = fileStatusData.state;
    }

    // Generate content using that file
    const response3 = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GOOGLE_API_KEY, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { file_data: { mime_type: fileInfo.type, file_uri: fileUri } },
                    { text: instructions },
                ]
            }]
        }),
    });

    const responseJson = await response3.json();
    console.log(responseJson);

    // Extract and log the content
    const textContent = responseJson.candidates?.[0]?.content?.parts?.[0]?.text;
    return textContent;
}

