const express = require('express')
const cors = require('cors')
require('dotenv').config()

const port = 3001

const app = express()
app.use(express.json())
app.use(cors())

//storage
const multer = require('multer')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + file.originalname)
    }
})
const upload = multer({ storage: storage })

// gemini
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { GenerationConfig } = require("@google/generative-ai")

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", generation_config: {"response_mime_type": "application/json"} });
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

// start server
const server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`)
})

app.get('/', (req, res) => {
    res.json('hello get')
})

app.post('/img/upload', upload.single('file'), (req, res) => {
    res.json(req.file)
})
const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
app.get('/get-poi-name', async (req, res) => {
    // Upload the file and specify a display name.
    try {
        const filename = "./uploads/" + req.query.filename
        const uploadResponse = await fileManager.uploadFile(filename, {
            mimeType: "image/jpeg",
            displayName: "processing image",
        });
    
        const getResponse = await fileManager.getFile(uploadResponse.file.name);
        // View the response.
        console.log(`Retrieved file ${getResponse.displayName} as ${getResponse.uri}`);
        
        const result = await model.generateContent(
            [
                {
                    fileData: {
                        mimeType: uploadResponse.file.mimeType,
                        fileUri: uploadResponse.file.uri
                    }
                },
                { text: "Determine the name and country in this pic and return json format, with this schema: { locationName: str, country: str}" },
            ]
        );
        const clean = result.response.text().replace(/^\s*```json\s*|\s*```\s*$/g, '')
        console.log(clean)
        return res.json(clean)
    } catch(e) {
        console.error(e)
        return res.status(400).send({
            message: 'This is an error occured, please try again'
         });
    }
    
})

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

function gracefulShutdown(signal) {
    server.close((err) => {
        console.log('Http server closed.');
        process.exit(err ? 1 : 0);
    });
}