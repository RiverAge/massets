import * as express from 'express'
import * as path from 'path'
import * as multer from 'multer'
import * as sharp from 'sharp'
import * as archiver from 'archiver'
import * as fs from 'fs'
import * as crypto from 'crypto'

const app = express()
const upload = multer()
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'index.html'))
})

app.post('/upload', upload.single('icon'), (req, res) => {

    const buffer = sharp(req.file.buffer)

    const output = fs.createWriteStream(path.resolve(__dirname, '../data/example.zip'))
    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
            console.log('waringing...')
        } else {
            console.log('error')
        }
    })
    archive.on('error', (err) => {
        console.log('error')
    })
    archive.pipe(output)
    archive.append(fs.createReadStream(path.resolve(__dirname, '../assets/Contents.json')), {name: 'Contents.json'})

    const map = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/size-map.json'), 'utf-8')).ios as {[props: string]: string[]}
    const keys = Object.keys(map)
    const p = keys.map((e) => {
        const [d1, d2] = e.split('x')

        return buffer.resize(parseInt(d1, 10), parseInt(d2, 10))
            .toBuffer()
            .then((b) => {
                const fileNames = map[e]
                fileNames.map((f) => archive.append(b, { name: f }))
            })
    })

    Promise.all(p).then((resolve) => {
        archive.finalize()
        // res.sendFile(path.resolve(__dirname, '../data/example.zip'))
    })

    res.send('OK')
     
})

app.listen(3000, () => console.log('start....'))