export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export type ApiField = {
  name: string
  type: string
  required?: boolean
  description: string
  example?: string
}

export type ApiEndpoint = {
  id: string
  method: HttpMethod
  path: string
  title: string
  summary: string
  auth: string
  scope?: string
  query?: ApiField[]
  body?: ApiField[]
  responseFields?: ApiField[]
  exampleResponse: unknown
}

export type ApiGroup = {
  id: string
  title: string
  endpoints: ApiEndpoint[]
}

/** ReelKit 核心接口目录（基于项目实际使用的 Supabase Auth / REST / RPC / Storage） */
export const API_BASE = 'https://pssggtorqkdvxoxwsoaf.supabase.co'

export const API_GROUPS: ApiGroup[] = [
  {
    id: 'overview',
    title: '概览',
    endpoints: [
      {
        id: 'capabilities',
        method: 'GET',
        path: '/api/docs/capabilities',
        title: '查询业务能力目录与参数说明',
        summary:
          '本文档页面本身提供的能力索引。ReelKit Web/H5 通过 Supabase 完成鉴权、内容读取、解锁扣币与播放事件上报。',
        auth: '无需鉴权（文档公开）',
        scope: '能力发现 / API 目录',
        responseFields: [
          { name: 'base', type: 'string', description: 'Supabase 项目 Base URL', example: API_BASE },
          { name: 'modules', type: 'string[]', description: '能力模块列表', example: '["auth","content","user","media","playback"]' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: {
            base: API_BASE,
            modules: ['auth', 'content', 'user', 'media', 'playback'],
          },
        },
      },
    ],
  },
  {
    id: 'auth',
    title: '登录鉴权',
    endpoints: [
      {
        id: 'auth-otp',
        method: 'POST',
        path: '/auth/v1/otp',
        title: '发送邮箱登录验证码',
        summary: '向邮箱发送 OTP / Magic Link 验证码。对应前端 LoginModal：signInWithOtp。',
        auth: 'apikey（anon key）',
        scope: 'Auth',
        body: [
          { name: 'email', type: 'string', required: true, description: '登录邮箱', example: 'user@example.com' },
          { name: 'create_user', type: 'boolean', required: false, description: '不存在时是否自动注册', example: 'true' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: { sent: true },
        },
      },
      {
        id: 'auth-verify',
        method: 'POST',
        path: '/auth/v1/verify',
        title: '校验验证码并登录',
        summary: '校验邮箱 OTP，成功后返回 session（access_token / refresh_token）。',
        auth: 'apikey（anon key）',
        scope: 'Auth',
        body: [
          { name: 'type', type: 'string', required: true, description: '固定 email', example: 'email' },
          { name: 'email', type: 'string', required: true, description: '登录邮箱', example: 'user@example.com' },
          { name: 'token', type: 'string', required: true, description: '邮件中的验证码', example: '12345678' },
        ],
        responseFields: [
          { name: 'access_token', type: 'string', description: 'JWT，后续请求放 Authorization Bearer' },
          { name: 'refresh_token', type: 'string', description: '刷新令牌' },
          { name: 'user.id', type: 'uuid', description: '用户 ID，对应 profiles.id' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: {
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'v1.refresh...',
            user: { id: 'bd0925e8-e019-4e56-b7fe-48415e91d89b', email: 'user@example.com' },
          },
        },
      },
    ],
  },
  {
    id: 'content',
    title: '内容读取',
    endpoints: [
      {
        id: 'dramas-list',
        method: 'GET',
        path: '/rest/v1/dramas',
        title: '分页查询已发布短剧',
        summary: '分类页 / 首页使用。按 primary_locale、status=published 过滤，可按标题模糊搜索。',
        auth: 'apikey；登录用户可带 Bearer',
        scope: 'Content',
        query: [
          { name: 'status', type: 'string', required: true, description: 'eq.published', example: 'eq.published' },
          { name: 'primary_locale', type: 'string', required: true, description: '语言：en|fr|pt|ja|es', example: 'eq.en' },
          { name: 'title', type: 'string', required: false, description: 'ilike.*keyword*', example: 'ilike.*love*' },
          { name: 'order', type: 'string', required: false, description: '排序', example: 'updated_at.desc' },
          { name: 'offset / limit', type: 'number', required: false, description: '分页（或 Range 头）', example: '0 / 14' },
        ],
        responseFields: [
          { name: 'id', type: 'uuid', description: '短剧 ID' },
          { name: 'title', type: 'string', description: '标题' },
          { name: 'cover_url', type: 'string|null', description: '封面' },
          { name: 'synopsis', type: 'string', description: '简介' },
          { name: 'primary_locale', type: 'string', description: '主语言' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              title: 'A Bond That Came Too Late',
              cover_url: 'https://.../poster.jpg',
              synopsis: '...',
              primary_locale: 'en',
              status: 'published',
            },
          ],
        },
      },
      {
        id: 'drama-detail',
        method: 'GET',
        path: '/rest/v1/dramas?id=eq.{drama_id}',
        title: '短剧详情',
        summary: '详情页读取单部短剧元数据。',
        auth: 'apikey',
        scope: 'Content',
        query: [
          { name: 'id', type: 'uuid', required: true, description: 'eq.{drama_id}', example: 'eq.11111111-...' },
          { name: 'select', type: 'string', required: false, description: '字段投影', example: '*' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: {
            id: '11111111-1111-1111-1111-111111111111',
            title: 'A Bond That Came Too Late',
            synopsis: 'A short drama synopsis.',
            cover_url: 'https://.../poster.jpg',
            tags: ['romance'],
            primary_locale: 'en',
          },
        },
      },
      {
        id: 'episodes-list',
        method: 'GET',
        path: '/rest/v1/episodes',
        title: '剧集列表',
        summary: '按 drama_id 拉取分集，含 coin_price / is_free。',
        auth: 'apikey',
        scope: 'Content',
        query: [
          { name: 'drama_id', type: 'uuid', required: true, description: 'eq.{drama_id}' },
          { name: 'order', type: 'string', required: false, description: 'episode_number.asc' },
        ],
        responseFields: [
          { name: 'id', type: 'uuid', description: '剧集 ID' },
          { name: 'episode_number', type: 'int', description: '集数' },
          { name: 'coin_price', type: 'int', description: '解锁金币价，0 表示免费' },
          { name: 'is_free', type: 'boolean', description: '是否免费标记' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: [
            { id: 'ep-1', episode_number: 1, title: 'EP1', coin_price: 0, is_free: true },
            { id: 'ep-2', episode_number: 2, title: 'EP2', coin_price: 30, is_free: false },
          ],
        },
      },
      {
        id: 'episode-videos',
        method: 'GET',
        path: '/rest/v1/episode_videos',
        title: '分语言视频资源',
        summary: '返回 storage_path / video_url，供播放器按 locale 选择。',
        auth: 'apikey',
        scope: 'Content',
        query: [
          { name: 'episode_id', type: 'uuid', required: true, description: 'eq.{episode_id}' },
          { name: 'select', type: 'string', required: false, description: 'locale,storage_path,video_url,...' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: [
            {
              episode_id: 'ep-1',
              locale: 'en',
              storage_path: 'dramas/xxx/ep1.mp4',
              video_url: null,
            },
          ],
        },
      },
      {
        id: 'banners',
        method: 'GET',
        path: '/rest/v1/banners',
        title: '首页 Banner',
        summary: '按 locale + is_active 拉取首页轮播。',
        auth: 'apikey',
        scope: 'Content',
        query: [
          { name: 'is_active', type: 'boolean', required: true, description: 'eq.true' },
          { name: 'locale', type: 'string', required: true, description: 'eq.en' },
          { name: 'order', type: 'string', required: false, description: 'sort_order.asc' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: [{ id: 'b1', title: 'Featured', image_url: 'https://...', drama_id: '1111...', locale: 'en' }],
        },
      },
      {
        id: 'home-sections',
        method: 'GET',
        path: '/rest/v1/home_sections',
        title: '首页编排分区',
        summary: '读取 home_sections，再关联 home_section_items → dramas。',
        auth: 'apikey',
        scope: 'Content',
        query: [
          { name: 'is_active', type: 'boolean', required: true, description: 'eq.true' },
          { name: 'order', type: 'string', required: false, description: 'sort_order.asc' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: [{ id: 'sec-1', title: 'New Release', slug: 'new-release', sort_order: 1 }],
        },
      },
    ],
  },
  {
    id: 'user',
    title: '用户与金币',
    endpoints: [
      {
        id: 'profile-me',
        method: 'GET',
        path: '/rest/v1/profiles?id=eq.{user_id}',
        title: '读取个人资料与金币余额',
        summary: '个人中心展示 display_name / username / email / coin_balance。需本人或管理员 RLS。',
        auth: 'Authorization: Bearer <access_token>',
        scope: 'User',
        query: [
          { name: 'id', type: 'uuid', required: true, description: 'eq.{auth.uid()}' },
          { name: 'select', type: 'string', required: false, description: 'id,email,display_name,username,coin_balance,client_source' },
        ],
        responseFields: [
          { name: 'coin_balance', type: 'int', description: '金币余额（管理端可调整）', example: '10000' },
          { name: 'display_name', type: 'string|null', description: '昵称' },
          { name: 'client_source', type: 'string|null', description: '来源：pc|h5|...' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: {
            id: 'bd0925e8-e019-4e56-b7fe-48415e91d89b',
            email: '1181602856@qq.com',
            display_name: '1181602856',
            username: '1181602856',
            coin_balance: 10000,
            client_source: 'pc',
          },
        },
      },
      {
        id: 'episode-unlocks',
        method: 'GET',
        path: '/rest/v1/episode_unlocks',
        title: '我的解锁记录',
        summary: '个人中心「My unlocks」。可嵌套 episodes 字段。',
        auth: 'Authorization: Bearer <access_token>',
        scope: 'User',
        query: [
          { name: 'user_id', type: 'uuid', required: true, description: 'eq.{auth.uid()}' },
          { name: 'select', type: 'string', required: false, description: 'id,coins_spent,created_at,episode:episodes(...)' },
          { name: 'order', type: 'string', required: false, description: 'created_at.desc' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: [
            {
              id: 'ul-1',
              coins_spent: 30,
              created_at: '2026-07-29T12:00:00Z',
              episode: { episode_number: 2, title: 'EP2', drama_id: '1111...' },
            },
          ],
        },
      },
      {
        id: 'unlock-episode',
        method: 'POST',
        path: '/rest/v1/rpc/unlock_episode',
        title: '金币解锁剧集',
        summary: '扣减 profiles.coin_balance，写入 episode_unlocks / coin_transactions。余额不足返回错误。',
        auth: 'Authorization: Bearer <access_token>',
        scope: 'User / Coins',
        body: [
          { name: 'p_episode_id', type: 'uuid', required: true, description: '要解锁的剧集 ID' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: { unlocked: true, episode_id: 'ep-2', coins_spent: 30, balance_after: 9970 },
        },
      },
    ],
  },
  {
    id: 'media',
    title: '媒资播放',
    endpoints: [
      {
        id: 'signed-url',
        method: 'POST',
        path: '/storage/v1/object/sign/videos/{storage_path}',
        title: '生成视频签名 URL',
        summary: 'videos 桶为私有。前端 resolvePlayableUrl 调用 createSignedUrl 后播放。',
        auth: 'Authorization: Bearer <access_token> 或满足 Storage RLS 的 anon 策略',
        scope: 'Media',
        body: [
          { name: 'expiresIn', type: 'number', required: false, description: '有效秒数', example: '3600' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: {
            signedURL: '/object/sign/videos/dramas/xxx/ep1.mp4?token=...',
          },
        },
      },
    ],
  },
  {
    id: 'playback',
    title: '播放事件',
    endpoints: [
      {
        id: 'play-events',
        method: 'POST',
        path: '/rest/v1/play_events',
        title: '上报播放事件',
        summary: '用户点击播放时写入，用于统计。允许匿名（user_id 可空）。',
        auth: 'apikey；登录时建议带 Bearer',
        scope: 'Analytics',
        body: [
          { name: 'user_id', type: 'uuid|null', required: false, description: '用户 ID' },
          { name: 'drama_id', type: 'uuid', required: true, description: '短剧 ID' },
          { name: 'episode_id', type: 'uuid', required: true, description: '剧集 ID' },
          { name: 'locale', type: 'string', required: false, description: '播放语言', example: 'en' },
          { name: 'client_source', type: 'string', required: false, description: 'pc | h5', example: 'pc' },
        ],
        exampleResponse: {
          code: 0,
          message: '成功',
          data: [{ id: 'pe-1', drama_id: '1111...', episode_id: 'ep-1', client_source: 'pc' }],
        },
      },
    ],
  },
]

export function findEndpoint(id: string) {
  for (const g of API_GROUPS) {
    const hit = g.endpoints.find((e) => e.id === id)
    if (hit) return hit
  }
  return API_GROUPS[0]?.endpoints[0]
}
