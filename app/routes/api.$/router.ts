import path from 'node:path'
import speech from '@google-cloud/speech'
import { Storage } from '@google-cloud/storage'
import { os } from '@orpc/server'
import { execa } from 'execa'
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'
import { z } from 'zod/v4'

if (import.meta.env.DEV) {
	const envHttpProxyAgent = new EnvHttpProxyAgent()

	setGlobalDispatcher(envHttpProxyAgent)
}

const VideoInfoSchema = z.object({
	title: z.string(),
	duration: z.number(),
	thumbnail: z.url(),
})

const getVideoInfo = os
	.input(z.object({ url: z.string() }))
	.handler(async ({ input }) => {
		const { url } = input

		const output =
			await execa`yt-dlp -O "%(.{title,duration,thumbnail})#j" ${url}`

		return VideoInfoSchema.parse(JSON.parse(output.stdout))
	})

const BUCKET_NAME = 'youtube2docs'

const speechClient = new speech.SpeechClient()

const storage = new Storage()

const getVideoAudio = os
	.input(z.object({ url: z.string() }))
	.handler(async ({ input }) => {
		const { url } = input

		const bucket = storage.bucket(BUCKET_NAME)

		const filenameProcess = await execa('yt-dlp', [
			'-x',
			'--audio-format',
			'mp3',
			'--restrict-filenames',
			'--print',
			'after_move:filepath',
			url,
		])

		const filename = path.basename(filenameProcess.stdout)
		const file = bucket.file(filename)

		const writeStream = file.createWriteStream({
			resumable: false,
			contentType: 'audio/mpeg',
		})

		const audioProcess = execa('yt-dlp', [
			'-x',
			'--audio-format',
			'mp3',
			'-o',
			'-',
			url,
		])

		audioProcess.stdout.pipe(writeStream)

		await new Promise((resolve, reject) => {
			writeStream.on('finish', resolve)
			writeStream.on('error', reject)
		})

		await audioProcess

		const uri = `gs://${BUCKET_NAME}/${filename}`

		try {
			const start = Date.now()

			const [operation] = await speechClient.longRunningRecognize({
				audio: {
					uri,
				},
				config: {
					model: 'video',
					encoding: 'MP3',
					sampleRateHertz: 16000,
					enableWordTimeOffsets: true,
					enableAutomaticPunctuation: true,
					languageCode: 'en-US',
				},
			})

			const [response] = await operation.promise()

			const text = response.results
				.map((r) => r.alternatives?.[0]?.transcript ?? '')
				.join('\n')

			return {
				text,
				result: response.results,
				end: Date.now() - start,
			}
		} finally {
			await file.delete()
		}
	})

const router = {
	video: {
		info: getVideoInfo,
		audio: getVideoAudio,
	},
}

export default router
