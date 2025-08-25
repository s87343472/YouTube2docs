import ky from 'ky'
import invariant from 'tiny-invariant'
import { z } from 'zod/v4'
import { $ } from 'zx'
import { type Route } from './+types/route'

const SubtitleFormatSchema = z.object({
	ext: z.string(),
	url: z.url(),
	name: z.string(),
})

const SubtitlesSchema = z.record(z.string(), z.array(SubtitleFormatSchema))

const YouTubeJSONSchema = z.object({
	title: z.string(),
	subtitles: SubtitlesSchema,
})

export const action = async ({ request }: Route.ActionArgs) => {
	const formData = await request.formData()

	const url = new URL(formData.get('url') as string)

	const output = await $`yt-dlp -O "%(.{title,subtitles})#j" ${url}`

	const json = YouTubeJSONSchema.parse(output.json())

	let srt: string | null = null

	for (const subtitles of Object.values(json.subtitles)) {
		for (const subtitle of subtitles) {
			if (subtitle.ext === 'srt') {
				console.log(subtitle.url)

				srt = await ky.get(subtitle.url, { timeout: false }).text()
			}
		}
	}

	invariant(srt, 'SRT subtitle not found')

	return {
		srt,
	}
}
