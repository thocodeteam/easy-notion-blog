import {
  NOTION_API_SECRET,
  DATABASE_ID,
  NUMBER_OF_POSTS_PER_PAGE,
} from './server-constants'
import {
  Post,
  Block,
  Paragraph,
  Heading1,
  Heading2,
  Heading3,
  BulletedListItem,
  NumberedListItem,
  Image,
  Code,
  Quote,
  Equation,
  Callout,
  Embed,
  Video,
  Bookmark,
  LinkPreview,
  Table,
  TableRow,
  TableCell,
  ColumnList,
  Column,
  RichText,
  Text,
  Annotation,
} from './interfaces'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Client } = require('@notionhq/client')
import * as blogIndexCache from './blog-index-cache'
import { getExistingSlug, resolveMissingSlugs } from './slug'

const client = new Client({
  auth: NOTION_API_SECRET,
})

export async function getPosts(pageSize = 10) {
  if (blogIndexCache.exists()) {
    const allPosts = await getAllPosts()
    return allPosts.slice(0, pageSize)
  }

  const params = {
    database_id: DATABASE_ID,
    filter: _buildFilter(),
    sorts: [
      {
        property: 'Date',
        timestamp: 'created_time',
        direction: 'descending',
      },
    ],
    page_size: pageSize,
  }

  const data = await client.databases.query(params)

  return _fillSlugs(
    data.results.filter(item => _validPost(item)).map(item => _buildPost(item))
  )
}

export async function getAllPosts() {
  let results = []

  if (blogIndexCache.exists()) {
    results = blogIndexCache.get()
    console.log('Found cached posts.')
  } else {
    const params = {
      database_id: DATABASE_ID,
      filter: _buildFilter(),
      sorts: [
        {
          property: 'Date',
          timestamp: 'created_time',
          direction: 'descending',
        },
      ],
      page_size: 100,
    }

    while (true) {
      const data = await client.databases.query(params)

      results = results.concat(data.results)

      if (!data.has_more) {
        break
      }

      params['start_cursor'] = data.next_cursor
    }
  }

  // Với cache build-time thì set-blog-index-cache.js đã sinh đủ slug, nên
  // _fillSlugs không tốn request nào.
  return _fillSlugs(
    results.filter(item => _validPost(item)).map(item => _buildPost(item))
  )
}

export async function getRankedPosts(pageSize = 10) {
  if (blogIndexCache.exists()) {
    const allPosts = await getAllPosts()
    return allPosts
      .filter(post => !!post.Rank)
      .sort((a, b) => {
        if (a.Rank > b.Rank) {
          return -1
        } else if (a.Rank === b.Rank) {
          return 0
        }
        return 1
      })
      .slice(0, pageSize)
  }

  const params = {
    database_id: DATABASE_ID,
    filter: _buildFilter([
      {
        property: 'Rank',
        number: {
          is_not_empty: true,
        },
      },
    ]),
    sorts: [
      {
        property: 'Rank',
        direction: 'descending',
      },
    ],
    page_size: pageSize,
  }

  const data = await client.databases.query(params)

  return _fillSlugs(
    data.results.filter(item => _validPost(item)).map(item => _buildPost(item))
  )
}

export async function getPostsBefore(date: string, pageSize = 10) {
  if (blogIndexCache.exists()) {
    const allPosts = await getAllPosts()
    return allPosts.filter(post => post.Date < date).slice(0, pageSize)
  }

  const params = {
    database_id: DATABASE_ID,
    filter: _buildFilter([
      {
        property: 'Date',
        date: {
          before: date,
        },
      },
    ]),
    sorts: [
      {
        property: 'Date',
        timestamp: 'created_time',
        direction: 'descending',
      },
    ],
    page_size: pageSize,
  }

  const data = await client.databases.query(params)

  return _fillSlugs(
    data.results.filter(item => _validPost(item)).map(item => _buildPost(item))
  )
}

export async function getNumberOfPages() {
  const allPosts = await getAllPosts()
  return Math.ceil(allPosts.length / NUMBER_OF_POSTS_PER_PAGE)
}

export async function getPostsByPage(page: number) {
  if (page < 1) return []

  const allPosts = await getAllPosts()
  const startIndex = (page - 1) * NUMBER_OF_POSTS_PER_PAGE

  return allPosts.slice(startIndex, startIndex + NUMBER_OF_POSTS_PER_PAGE)
}

export async function getNumberOfPagesByTag(tag: string) {
  if (!tag) return 0

  const allPosts = await getAllPosts()
  const taggedPosts = allPosts.filter(post => post.Tags.includes(tag))

  return Math.ceil(taggedPosts.length / NUMBER_OF_POSTS_PER_PAGE)
}

export async function getPostsByTagAndPage(tag: string, page: number) {
  if (!tag || page < 1) return []

  const allPosts = await getAllPosts()
  const taggedPosts = allPosts.filter(post => post.Tags.includes(tag))
  const startIndex = (page - 1) * NUMBER_OF_POSTS_PER_PAGE

  return taggedPosts.slice(startIndex, startIndex + NUMBER_OF_POSTS_PER_PAGE)
}

// Các URL cũ dạng /blog/before/<date> vẫn phải hiển thị đúng số trang hiện tại,
// nên quy đổi mốc ngày thành số trang: đếm số bài mới hơn hoặc bằng mốc đó.
export async function getPageNumberByBeforeDate(date: string) {
  const allPosts = await getAllPosts()
  const newerPosts = allPosts.filter(post => post.Date >= date)

  return Math.floor(newerPosts.length / NUMBER_OF_POSTS_PER_PAGE) + 1
}

export async function getPageNumberByTagAndBeforeDate(
  tag: string,
  date: string
) {
  if (!tag) return 1

  const allPosts = await getAllPosts()
  const newerPosts = allPosts.filter(
    post => post.Tags.includes(tag) && post.Date >= date
  )

  return Math.floor(newerPosts.length / NUMBER_OF_POSTS_PER_PAGE) + 1
}

export async function getFirstPost() {
  if (blogIndexCache.exists()) {
    const allPosts = await getAllPosts()
    return allPosts[allPosts.length - 1]
  }

  const params = {
    database_id: DATABASE_ID,
    filter: _buildFilter(),
    sorts: [
      {
        property: 'Date',
        timestamp: 'created_time',
        direction: 'ascending',
      },
    ],
    page_size: 1,
  }

  const data = await client.databases.query(params)

  if (!data.results.length) {
    return null
  }

  if (!_validPost(data.results[0])) {
    return null
  }

  const [post] = await _fillSlugs([_buildPost(data.results[0])])
  return post || null
}

export async function getPostBySlug(slug: string) {
  if (blogIndexCache.exists()) {
    const allPosts = await getAllPosts()
    return allPosts.find(post => post.Slug === slug)
  }

  const data = await client.databases.query({
    database_id: DATABASE_ID,
    filter: _buildFilter([
      {
        property: 'Slug',
        rich_text: {
          equals: slug,
        },
      },
    ]),
    sorts: [
      {
        property: 'Date',
        timestamp: 'created_time',
        direction: 'ascending',
      },
    ],
  })

  if (!data.results.length) {
    return _getPostByGeneratedSlug(slug)
  }

  if (!_validPost(data.results[0])) {
    return null
  }

  const [post] = await _fillSlugs([_buildPost(data.results[0])])
  return post || null
}

export async function getPostsByTag(tag: string | undefined, pageSize = 100) {
  if (!tag) return []

  if (blogIndexCache.exists()) {
    const allPosts = await getAllPosts()
    return allPosts.filter(post => post.Tags.includes(tag)).slice(0, pageSize)
  }

  const params = {
    database_id: DATABASE_ID,
    filter: _buildFilter([
      {
        property: 'Tags',
        multi_select: {
          contains: tag,
        },
      },
    ]),
    sorts: [
      {
        property: 'Date',
        timestamp: 'created_time',
        direction: 'descending',
      },
    ],
    page_size: pageSize,
  }

  const data = await client.databases.query(params)

  return _fillSlugs(
    data.results.filter(item => _validPost(item)).map(item => _buildPost(item))
  )
}

export async function getPostsByTagBefore(
  tag: string,
  date: string,
  pageSize = 100
) {
  if (blogIndexCache.exists()) {
    const allPosts = await getAllPosts()
    return allPosts
      .filter(post => {
        return post.Tags.includes(tag) && new Date(post.Date) < new Date(date)
      })
      .slice(0, pageSize)
  }

  const params = {
    database_id: DATABASE_ID,
    filter: _buildFilter([
      {
        property: 'Tags',
        multi_select: {
          contains: tag,
        },
      },
      {
        property: 'Date',
        date: {
          before: date,
        },
      },
    ]),
    sorts: [
      {
        property: 'Date',
        timestamp: 'created_time',
        direction: 'descending',
      },
    ],
    page_size: pageSize,
  }

  const data = await client.databases.query(params)

  return _fillSlugs(
    data.results.filter(item => _validPost(item)).map(item => _buildPost(item))
  )
}

export async function getFirstPostByTag(tag: string) {
  if (blogIndexCache.exists()) {
    const allPosts = await getAllPosts()
    const sameTagPosts = allPosts.filter(post => post.Tags.includes(tag))
    return sameTagPosts[sameTagPosts.length - 1]
  }

  const params = {
    database_id: DATABASE_ID,
    filter: _buildFilter([
      {
        property: 'Tags',
        multi_select: {
          contains: tag,
        },
      },
    ]),
    sorts: [
      {
        property: 'Date',
        timestamp: 'created_time',
        direction: 'ascending',
      },
    ],
    page_size: 1,
  }

  const data = await client.databases.query(params)

  if (!data.results.length) {
    return null
  }

  if (!_validPost(data.results[0])) {
    return null
  }

  const [post] = await _fillSlugs([_buildPost(data.results[0])])
  return post || null
}

export async function getAllBlocksByBlockId(blockId: string) {
  let allBlocks: Block[] = []

  const params = {
    block_id: blockId,
  }

  while (true) {
    const data = await client.blocks.children.list(params)

    const blocks = data.results.map(item => {
      const block: Block = {
        Id: item.id,
        Type: item.type,
        HasChildren: item.has_children,
      }

      switch (item.type) {
        case 'paragraph':
          const paragraph: Paragraph = {
            RichTexts: item.paragraph.rich_text.map(_buildRichText),
            Color: item.paragraph.color,
          }

          block.Paragraph = paragraph
          break
        case 'heading_1':
          const heading1: Heading1 = {
            RichTexts: item.heading_1.rich_text.map(_buildRichText),
            Color: item.heading_1.color,
          }

          block.Heading1 = heading1
          break
        case 'heading_2':
          const heading2: Heading2 = {
            RichTexts: item.heading_2.rich_text.map(_buildRichText),
            Color: item.heading_2.color,
          }

          block.Heading2 = heading2
          break
        case 'heading_3':
          const heading3: Heading3 = {
            RichTexts: item.heading_3.rich_text.map(_buildRichText),
            Color: item.heading_3.color,
          }

          block.Heading3 = heading3
          break
        case 'bulleted_list_item':
          const bulletedListItem: BulletedListItem = {
            RichTexts: item.bulleted_list_item.rich_text.map(_buildRichText),
            Color: item.bulleted_list_item.color,
          }

          block.BulletedListItem = bulletedListItem
          break
        case 'numbered_list_item':
          const numberedListItem: NumberedListItem = {
            RichTexts: item.numbered_list_item.rich_text.map(_buildRichText),
            Color: item.numbered_list_item.color,
          }

          block.NumberedListItem = numberedListItem
          break
        case 'video':
          const video: Video = {
            Type: item.video.type,
          }

          if (item.video.type === 'external') {
            video.External = { Url: item.video.external.url }
          }

          block.Video = video
          break
        case 'image':
          const image: Image = {
            Caption: item.image.caption.map(_buildRichText),
            Type: item.image.type,
          }

          if (item.image.type === 'external') {
            image.External = { Url: item.image.external.url }
          } else {
            image.File = { Url: item.image.file.url, ExpiryTime: item.image.file.expiry_time }
          }

          block.Image = image
          break
        case 'code':
          const code: Code = {
            Caption: item[item.type].caption.map(_buildRichText),
            Text: item[item.type].rich_text.map(_buildRichText),
            Language: item.code.language,
          }

          block.Code = code
          break
        case 'quote':
          const quote: Quote = {
            Text: item[item.type].rich_text.map(_buildRichText),
            Color: item[item.type].color,
          }

          block.Quote = quote
          break
        case 'equation':
          const equation: Equation = {
            Expression: item[item.type].expression,
          }

          block.Equation = equation
          break
        case 'callout':
          const callout: Callout = {
            RichTexts: item[item.type].rich_text.map(_buildRichText),
            Icon: {
              Emoji: item[item.type].icon.emoji,
            },
            Color: item[item.type].color,
          }

          block.Callout = callout
          break
        case 'embed':
          const embed: Embed = {
            Url: item.embed.url,
          }

          block.Embed = embed
          break
        case 'bookmark':
          const bookmark: Bookmark = {
            Url: item.bookmark.url,
          }

          block.Bookmark = bookmark
          break
        case 'link_preview':
          const linkPreview: LinkPreview = {
            Url: item.link_preview.url,
          }

          block.LinkPreview = linkPreview
          break
        case 'table':
          const table: Table = {
            TableWidth: item.table.table_width,
            HasColumnHeader: item.table.has_column_header,
            HasRowHeader: item.table.has_row_header,
            Rows: [],
          }

          block.Table = table
          break
        case 'column_list':
          const columnList: ColumnList = {
            Columns: [],
          }

          block.ColumnList = columnList
          break
      }

      return block
    })

    allBlocks = allBlocks.concat(blocks)

    if (!data.has_more) {
      break
    }

    params['start_cursor'] = data.next_cursor
  }

  for (let i = 0; i < allBlocks.length; i++) {
    const block = allBlocks[i]

    if (block.Type === 'table') {
      block.Table.Rows = await _getTableRows(block.Id)
    } else if (block.Type === 'column_list') {
      block.ColumnList.Columns = await _getColumns(block.Id)
    } else if (block.Type === 'bulleted_list_item' && block.HasChildren) {
      block.BulletedListItem.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'numbered_list_item' && block.HasChildren) {
      block.NumberedListItem.Children = await getAllBlocksByBlockId(block.Id)
    }
  }

  return allBlocks
}

async function _getTableRows(blockId: string): Promise<TableRow[]> {
  let tableRows: TableRow[] = []

  const params = {
    block_id: blockId,
  }

  while (true) {
    const data = await client.blocks.children.list(params)

    const blocks = data.results.map(item => {
      const tableRow: TableRow = {
        Id: item.id,
        Type: item.type,
        HasChildren: item.has_children,
        Cells: []
      }

      if (item.type === 'table_row') {
        const cells: TableCell[] = item.table_row.cells.map(cell => {
          const tableCell: TableCell = {
            RichTexts: cell.map(_buildRichText),
          }

          return tableCell
        })

        tableRow.Cells = cells
      }

      return tableRow
    })

    tableRows = tableRows.concat(blocks)

    if (!data.has_more) {
      break
    }

    params['start_cursor'] = data.next_cursor
  }

  return tableRows
}

async function _getColumns(blockId: string): Promise<Column[]> {
  let columns: Column[] = []

  const params = {
    block_id: blockId,
  }

  while (true) {
    const data = await client.blocks.children.list(params)

    const blocks = await Promise.all(data.results.map(async item => {
      const children = await getAllBlocksByBlockId(item.id)

      const column: Column = {
        Id: item.id,
        Type: item.type,
        HasChildren: item.has_children,
        Children: children,
      }

      return column
    }))

    columns = columns.concat(blocks)

    if (!data.has_more) {
      break
    }

    params['start_cursor'] = data.next_cursor
  }

  return columns
}

export async function getAllTags() {
  if (blogIndexCache.exists()) {
    const allPosts = await getAllPosts()
    return [...new Set(allPosts.flatMap(post => post.Tags))].sort()
  }

  const data = await client.databases.retrieve({
    database_id: DATABASE_ID,
  })
  return data.properties.Tags.multi_select.options
    .map(option => option.name)
    .sort()
}

export interface ContactSubmission {
  name: string
  email: string
  kind: string
  title: string
  content: string
  draftUrl: string
}

// Ghi một lượt gửi form "Liên hệ / Góp bài" vào database liên hệ riêng.
// Nội dung đi vào thân trang (block) thay vì property để tránh giới hạn
// 2000 ký tự của rich text; thời điểm gửi lấy từ created_time của Notion.
export async function createContactSubmission(
  databaseId: string,
  submission: ContactSubmission
) {
  const properties = {
    'Tiêu đề': { title: _toRichText(submission.title) },
    'Họ tên': { rich_text: _toRichText(submission.name) },
    Email: { email: submission.email },
    Loại: { select: { name: submission.kind } },
    'Trạng thái': { select: { name: 'Mới' } },
  }
  if (submission.draftUrl) {
    properties['Link bản nháp'] = { url: submission.draftUrl }
  }

  await client.pages.create({
    parent: { database_id: databaseId },
    properties,
    children: _toParagraphBlocks(submission.content),
  })
}

// Notion giới hạn 2000 ký tự cho mỗi phần tử rich text.
function _toRichText(text: string) {
  const chunks = []
  for (let i = 0; i < text.length; i += 2000) {
    chunks.push({ type: 'text', text: { content: text.slice(i, i + 2000) } })
  }
  return chunks
}

// Mỗi đoạn (cách nhau bởi dòng trống) thành một paragraph block.
// Một request tạo trang chỉ nhận tối đa 100 block con.
function _toParagraphBlocks(content: string) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
  if (paragraphs.length > 100) {
    paragraphs.splice(99, paragraphs.length, paragraphs.slice(99).join('\n\n'))
  }

  return paragraphs.map(paragraph => ({
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: _toRichText(paragraph) },
  }))
}

function _buildFilter(conditions = []) {
  if (process.env.NODE_ENV === 'development') {
    return { and: conditions }
  }

  return {
    and: _uniqueConditions(
      conditions.concat([
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
      ])
    ),
  }
}

function _uniqueConditions(conditions = []) {
  const properties = []

  return conditions.filter(cond => {
    if (properties.includes(cond.property)) {
      return false
    }
    properties.push(cond.property)
    return true
  })
}

// Slug trống không còn loại bài: getAllPosts sinh slug cho nó.
function _validPost(data) {
  const prop = data.properties
  return prop.Page.title.length > 0 && !!prop.Date.date
}

// Bài nào ô Slug trống thì lấy slug đã sinh. Không tốn request khi mọi bài đã
// có slug.
async function _fillSlugs(posts: Post[]): Promise<Post[]> {
  if (posts.every(post => !!post.Slug)) {
    return posts
  }

  const pending = await _getPostsPendingSlug()

  return posts
    .map(post => {
      if (post.Slug) return post
      const generated = pending.get(post.PageId)
      return { ...post, Slug: generated ? generated.Slug : '' }
    })
    .filter(post => !!post.Slug)
}

// Không bài nào có Slug khớp trong Notion. Slug có thể là slug vừa sinh mà
// chưa ghi được vào Notion (thiếu quyền "Update content"), nên tìm trong các
// bài đang chờ slug. Tối đa 1 request mỗi PENDING_SLUGS_TTL_MS mỗi process,
// dù có bao nhiêu link sai.
async function _getPostByGeneratedSlug(slug: string) {
  const pending = await _getPostsPendingSlug()
  return Array.from(pending.values()).find(post => post.Slug === slug) || null
}

// Bài published có ô Slug trống, đã gán slug, theo page id. Mọi truy vấn trong
// một process dùng chung một lượt tính, kể cả các lời gọi song song trong cùng
// getStaticProps, và giữ kết quả bằng đúng chu kỳ ISR. Bài mới đăng mà chưa có
// slug hiện lên chậm nhất sau chừng ấy.
const PENDING_SLUGS_TTL_MS = 60 * 1000
let pendingSlugs: {
  expiresAt: number
  posts: Promise<Map<string, Post>>
} | null = null

function _getPostsPendingSlug(): Promise<Map<string, Post>> {
  if (pendingSlugs && Date.now() < pendingSlugs.expiresAt) {
    return pendingSlugs.posts
  }

  const entry = {
    expiresAt: Date.now() + PENDING_SLUGS_TTL_MS,
    posts: _resolvePostsPendingSlug(),
  }
  pendingSlugs = entry
  // Lỗi đọc (rate limit...) không được giữ suốt TTL: lần gọi sau thử lại.
  entry.posts.catch(() => {
    if (pendingSlugs === entry) pendingSlugs = null
  })
  return entry.posts
}

async function _resolvePostsPendingSlug(): Promise<Map<string, Post>> {
  const params = {
    database_id: DATABASE_ID,
    filter: _buildFilter([
      {
        property: 'Slug',
        rich_text: {
          is_empty: true,
        },
      },
    ]),
    page_size: 100,
  }

  let results = []
  while (true) {
    const data = await client.databases.query(params)

    results = results.concat(data.results)

    if (!data.has_more) {
      break
    }

    params['start_cursor'] = data.next_cursor
  }

  const posts: Post[] = results
    .filter(item => _validPost(item))
    .map(item => _buildPost(item))

  const generated = await resolveMissingSlugs(
    client,
    DATABASE_ID,
    posts.map(post => ({ id: post.PageId, title: post.Title, date: post.Date }))
  )

  return new Map(
    posts.map(post => [
      post.PageId,
      { ...post, Slug: generated.get(post.PageId) || '' },
    ])
  )
}

function _buildPost(data) {
  const prop = data.properties

  const post: Post = {
    PageId: data.id,
    Title: prop.Page.title.map(rt => rt.plain_text).join(''),
    Slug: getExistingSlug(data),
    Date: prop.Date.date.start,
    Tags: prop.Tags.multi_select.map(opt => opt.name),
    // Notion splits rich text into segments at every formatting change
    // (bold, italic, link...), so join all of them instead of taking the first.
    Excerpt: prop.Excerpt.rich_text.map(rt => rt.plain_text).join(''),
    OGImage:
      prop.OGImage.files.length > 0 ? prop.OGImage.files[0].file.url : null,
    Rank: prop.Rank.number,
  }

  return post
}

function _buildRichText(item) {
  const annotation: Annotation = {
    Bold: item.annotations.bold,
    Italic: item.annotations.italic,
    Strikethrough: item.annotations.strikethrough,
    Underline: item.annotations.underline,
    Code: item.annotations.code,
    Color: item.annotations.color,
  }

  const richText: RichText = {
    Annotation: annotation,
    PlainText: item.plain_text,
    Href: item.href,
  }

  if (item.type === 'text') {
    const text: Text = {
      Content: item.text.content,
      Link: item.text.link,
    }
    richText.Text = text
  } else if (item.type === 'equation') {
    const equation: Equation = {
      Expression: item.equation.expression,
    }
    richText.Equation = equation
  }

  return richText
}
