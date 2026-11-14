/* eslint @typescript-eslint/no-var-requires: 0 */
// use commonjs so it can be required without transpiling

const fs = require('fs')

const {
  NOTION_API_SECRET,
  DATABASE_ID,
  BLOG_INDEX_CACHE,
} = require('./server-constants')
const { Client } = require('@notionhq/client')
const { getExistingSlug, resolveMissingSlugs } = require('./slug')

const notionClient = new Client({
  auth: NOTION_API_SECRET,
})

exports.exists = function() {
  return fs.existsSync(BLOG_INDEX_CACHE)
}

exports.get = function() {
  return JSON.parse(fs.readFileSync(BLOG_INDEX_CACHE))
}

exports.set = async function() {
  let params = {
    database_id: DATABASE_ID,
    filter: {
      and: [
        {
          property: 'Published',
          checkbox: {
            equals: true,
          },
        },
        {
          property: 'Date',
          date: {
            on_or_before: new Date().toISOString(),
          },
        },
      ],
    },
    sorts: [
      {
        property: 'Date',
        timestamp: 'created_time',
        direction: 'descending',
      },
    ],
    page_size: 100,
  }

  let results = []

  while (true) {
    const data = await notionClient.databases.query(params)

    results = results.concat(data.results)

    if (!data.has_more) {
      break
    }

    params['start_cursor'] = data.next_cursor
  }

  await fillMissingSlugs(results)
  fs.writeFileSync(BLOG_INDEX_CACHE, JSON.stringify(results))
  console.log(`Cached ${results.length} posts into ${BLOG_INDEX_CACHE}`)

  return
}

// Sinh slug một lần lúc build, trước khi ghi cache, rồi chép vào trang thô trong
// cache. Nhờ vậy các worker của `next build` đọc cache đã đủ slug và không ghi
// Notion lặp lại.
async function fillMissingSlugs(pages) {
  const missing = pages.filter(
    page =>
      page.properties.Page.title.length > 0 &&
      !!page.properties.Date.date &&
      !getExistingSlug(page)
  )
  const generated = await resolveMissingSlugs(
    notionClient,
    DATABASE_ID,
    missing.map(page => ({
      id: page.id,
      title: page.properties.Page.title.map(rt => rt.plain_text).join(''),
      date: page.properties.Date.date.start,
    }))
  )
  missing.forEach(page => {
    const slug = generated.get(page.id)
    page.properties.Slug.rich_text = [
      { type: 'text', text: { content: slug, link: null }, plain_text: slug },
    ]
  })
}
exports.expire = function() {
  return fs.unlinkSync(BLOG_INDEX_CACHE)
}
