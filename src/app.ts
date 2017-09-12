import * as express from 'express'
import * as path from 'path'
import * as multer from 'multer'
import * as sharp from 'sharp'
import * as archiver from 'archiver'
import * as fs from 'fs'
import * as crypto from 'crypto'

const app = express()
const upload = multer()

const dataDir =  path.resolve(__dirname, '../data/')
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir)
}

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'index.html'))
})

app.post('/assets', upload.array('assets'), (req, res) => {

    const outputFile = path.resolve(__dirname, dataDir, crypto.randomBytes(16).toString('hex'))
    const output = fs.createWriteStream(outputFile)
    const archive = archiver('zip', { gzip: true })

    output.on('close', () => {
        res.setHeader('Content-Disposition', 'attachment; filename=assets.zip')
        res.sendFile(outputFile)
    })

    archive.pipe(output)

    const files = req.files

    const p:Promise<any>[] = []
    if (files instanceof Array) {
        files.map((e, i) => {
            const buffer = sharp(e.buffer)
            buffer.metadata().then(({width, height, format}) => {
                if (format && format.toUpperCase() === 'PNG') {
                    const scale = [{ scale: 1, suffix: '@3x' }, { scale: 1.5, suffix: '@2x' }, { scale: 3, suffix: '' }]
                    const t = scale.map(({ scale, suffix }) => {
                        p.push(buffer.resize(width && Math.round(width / scale), height && Math.round(height / scale)).toBuffer()
                            .then((b) => {
                                const parsedPath = path.parse(e.originalname)
                                const name = parsedPath.name + suffix + parsedPath.ext
                                archive.append(b, { name })
                            }))
                    })
                    if (i === files.length -1 ) {
                        Promise.all(p).then(() => archive.finalize())
                    }
                }
            }) 
        })
    }
})

app.post('/icon', upload.single('icon'), (req, res) => {

    const buffer = sharp(req.file.buffer).metadata((err, meta) => {
    })

    const outputFile = path.resolve(__dirname, dataDir, crypto.randomBytes(16).toString('hex'))
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