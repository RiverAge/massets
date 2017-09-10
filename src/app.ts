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

    const outputFile = path.resolve(__dirname, `../data/${crypto.randomBytes(16).toString('hex')}`)
    const output = fs.createWriteStream(outputFile)
    const archive = archiver('zip', { gzip: true })

    output.on('close', () => {
        res.setHeader('Content-Disposition', 'attachment; filename=icon.zip')
        res.sendFile(outputFile)
    })


    archive.pipe(output)
    archive.append(fs.createReadStream(path.resolve(__dirname, '../assets/Contents.json')), { name: 'Contents.json', prefix: 'ios' })

    const sizeMap = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/size-map.json'), 'utf-8')) as { dim: string, files?: string[], dir?: string }[]


    const buffers = sizeMap.map((e) => {
        const [d1, d2] = e.dim.split('x')

        return buffer.resize(parseInt(d1, 10), parseInt(d2, 10))
            .toBuffer()
            .then((b) => {
                if (e.files) {
                    e.files.map((f) => archive.append(b, { name: f, prefix: 'ios' }))
                }
                if (e.dir) {
                    archive.append(b, { name: 'ic_launcher.png', prefix: 'android/' + e.dir })
                }

            })
    })

    Promise.all(buffers).then(() => archive.finalize())

})

app.listen(3000, () => console.log('start....'))