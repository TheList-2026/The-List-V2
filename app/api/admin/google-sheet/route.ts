
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supplied = request.nextUrl.searchParams.get('url') || ''
    if (supplied.length > 2048) {
      return NextResponse.json(
        { error: 'Google Sheets link is too long.' },
        { status: 400 }
      )
    }

    const link = new URL(supplied)

    if (
      link.protocol !== 'https:' ||
      link.hostname !== 'docs.google.com' ||
      link.port ||
      link.username ||
      link.password
    ) {
      throw new Error('Paste a Google Sheets link from docs.google.com.')
    }

    let csvUrl: URL

    const published = link.pathname.match(
      /^\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)\/pub$/
    )

    const standard = link.pathname.match(
      /^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/edit|\/export)?$/
    )

    if (published) {
      csvUrl = new URL(
        `https://docs.google.com/spreadsheets/d/e/${published[1]}/pub`
      )
      csvUrl.searchParams.set('output', 'csv')

      const gid = link.searchParams.get('gid')
      if (gid && /^\d+$/.test(gid)) {
        csvUrl.searchParams.set('gid', gid)
      }
    } else if (standard) {
      csvUrl = new URL(
        `https://docs.google.com/spreadsheets/d/${standard[1]}/export`
      )
      csvUrl.searchParams.set('format', 'csv')

      const gid =
        link.searchParams.get('gid') ||
        link.hash.match(/gid=(\d+)/)?.[1]

      if (gid && /^\d+$/.test(gid)) {
        csvUrl.searchParams.set('gid', gid)
      }
    } else {
      throw new Error(
        'Invalid Google Sheets link. Use a published CSV link or a shareable spreadsheet URL.'
      )
    }

    const response = await fetch(csvUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(12000)
    })

    if (!response.ok) {
      throw new Error(
        'Google could not open this sheet. Check its sharing or Publish to web settings.'
      )
    }

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('text/html')) {
      throw new Error(
        'Google returned a sign-in page. Publish the sheet to the web as CSV first.'
      )
    }

    const size = Number(response.headers.get('content-length') || 0)

    if (size > 2_000_000) {
      throw new Error('Sheet exceeds the 2 MB import limit.')
    }

    const csv = await response.text()

    if (csv.length > 2_000_000) {
      throw new Error('Sheet exceeds the 2 MB import limit.')
    }

    if (!csv.trim()) {
      throw new Error('The Google Sheet is empty.')
    }

    return NextResponse.json(
      { csv },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to read Google Sheet.'
      },
      { status: 400 }
    )
  }
}
