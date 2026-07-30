<script setup lang="ts">
import { API_BASE, API_GROUPS, findEndpoint, type ApiEndpoint, type HttpMethod } from '~/data/apiDocs'

definePageMeta({
  layout: false,
})

useHead({
  title: 'ReelKit API Docs',
})

const route = useRoute()
const router = useRouter()

const activeId = computed({
  get: () => String(route.query.e || API_GROUPS[0]?.endpoints[0]?.id || ''),
  set: (id: string) => {
    router.replace({ query: { ...route.query, e: id } })
  },
})

const active = computed<ApiEndpoint | undefined>(() => findEndpoint(activeId.value))

const methodClass: Record<HttpMethod, string> = {
  GET: 'm-get',
  POST: 'm-post',
  PATCH: 'm-patch',
  DELETE: 'm-del',
}

function selectEndpoint(id: string) {
  activeId.value = id
}

function copyPath() {
  if (!active.value || !import.meta.client) return
  navigator.clipboard.writeText(`${API_BASE}${active.value.path}`)
}
</script>

<template>
  <div class="docs">
    <aside class="side">
      <div class="side-brand">
        <NuxtLink to="/" class="back">← ReelKit</NuxtLink>
        <h1>API Docs</h1>
        <p class="base" :title="API_BASE">{{ API_BASE.replace('https://', '') }}</p>
      </div>

      <nav class="nav">
        <section v-for="group in API_GROUPS" :key="group.id" class="group">
          <h2>{{ group.title }}</h2>
          <button
            v-for="ep in group.endpoints"
            :key="ep.id"
            type="button"
            class="ep-link"
            :class="{ active: activeId === ep.id }"
            @click="selectEndpoint(ep.id)"
          >
            <span class="method" :class="methodClass[ep.method]">{{ ep.method }}</span>
            <span class="label">{{ ep.title }}</span>
          </button>
        </section>
      </nav>
    </aside>

    <main v-if="active" class="main">
      <header class="ep-head">
        <div class="path-row">
          <span class="method lg" :class="methodClass[active.method]">{{ active.method }}</span>
          <code class="path">{{ active.path }}</code>
          <button type="button" class="copy" @click="copyPath">复制</button>
        </div>
        <h2>{{ active.title }}</h2>
        <p class="summary">{{ active.summary }}</p>
      </header>

      <section class="block">
        <h3>鉴权</h3>
        <div class="auth-box">
          <code>{{ active.auth }}</code>
          <p v-if="active.scope" class="scope">TOKEN Scope：{{ active.scope }}</p>
        </div>
      </section>

      <section v-if="active.query?.length" class="block">
        <h3>Query 参数</h3>
        <table>
          <thead>
            <tr>
              <th>字段</th>
              <th>类型</th>
              <th>必填</th>
              <th>说明</th>
              <th>示例</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in active.query" :key="f.name">
              <td><code>{{ f.name }}</code></td>
              <td>{{ f.type }}</td>
              <td>{{ f.required ? '是' : '否' }}</td>
              <td>{{ f.description }}</td>
              <td><code v-if="f.example">{{ f.example }}</code></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="active.body?.length" class="block">
        <h3>Body 字段</h3>
        <table>
          <thead>
            <tr>
              <th>字段</th>
              <th>类型</th>
              <th>必填</th>
              <th>说明</th>
              <th>示例</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in active.body" :key="f.name">
              <td><code>{{ f.name }}</code></td>
              <td>{{ f.type }}</td>
              <td>{{ f.required ? '是' : '否' }}</td>
              <td>{{ f.description }}</td>
              <td><code v-if="f.example">{{ f.example }}</code></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="active.responseFields?.length" class="block">
        <h3>DATA 业务字段</h3>
        <table>
          <thead>
            <tr>
              <th>字段</th>
              <th>类型</th>
              <th>说明</th>
              <th>示例</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in active.responseFields" :key="f.name">
              <td><code>{{ f.name }}</code></td>
              <td>{{ f.type }}</td>
              <td>{{ f.description }}</td>
              <td><code v-if="f.example">{{ f.example }}</code></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="block">
        <h3>统一响应外层（JSON 门面）</h3>
        <table>
          <thead>
            <tr>
              <th>字段</th>
              <th>类型</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>code</code></td>
              <td>integer</td>
              <td>业务状态码，0 = 成功</td>
            </tr>
            <tr>
              <td><code>message</code></td>
              <td>string</td>
              <td>错误或提示文案</td>
            </tr>
            <tr>
              <td><code>data</code></td>
              <td>any</td>
              <td>实际业务载荷（PostgREST 原始响应可视为 data）</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="block">
        <h3>响应示例</h3>
        <pre class="code"><code>{{ JSON.stringify(active.exampleResponse, null, 2) }}</code></pre>
      </section>
    </main>
  </div>
</template>

<style scoped>
.docs {
  --docs-bg: #0b1220;
  --docs-panel: #111a2b;
  --docs-line: #1e2a3f;
  --docs-text: #e8eef9;
  --docs-muted: #8fa0b8;
  --docs-accent: #5b9fff;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  background: var(--docs-bg);
  color: var(--docs-text);
  font-family: "Segoe UI", "PingFang SC", "Noto Sans SC", system-ui, sans-serif;
}

.side {
  border-right: 1px solid var(--docs-line);
  background: #0a101c;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: auto;
}

.side-brand {
  padding: 20px 16px 12px;
  border-bottom: 1px solid var(--docs-line);
}

.back {
  display: inline-block;
  color: var(--docs-muted);
  font-size: 12px;
  margin-bottom: 10px;
}

.side-brand h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

.base {
  margin: 6px 0 0;
  color: var(--docs-muted);
  font-size: 11px;
  word-break: break-all;
}

.nav {
  padding: 12px 10px 28px;
}

.group {
  margin-bottom: 16px;
}

.group h2 {
  margin: 0 0 8px;
  padding: 0 8px;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--docs-muted);
  text-transform: uppercase;
}

.ep-link {
  width: 100%;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--docs-text);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
}

.ep-link:hover,
.ep-link.active {
  background: rgba(91, 159, 255, 0.1);
}

.ep-link.active {
  outline: 1px solid rgba(91, 159, 255, 0.35);
}

.label {
  font-size: 13px;
  line-height: 1.35;
}

.method {
  display: inline-grid;
  place-items: center;
  min-width: 46px;
  height: 20px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.method.lg {
  min-width: 56px;
  height: 26px;
  font-size: 12px;
}

.m-get { background: rgba(34, 197, 94, 0.18); color: #4ade80; }
.m-post { background: rgba(59, 130, 246, 0.18); color: #60a5fa; }
.m-patch { background: rgba(245, 158, 11, 0.18); color: #fbbf24; }
.m-del { background: rgba(239, 68, 68, 0.18); color: #f87171; }

.main {
  padding: 28px 36px 64px;
  overflow: auto;
  max-width: 980px;
}

.ep-head {
  margin-bottom: 24px;
}

.path-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.path {
  font-size: 15px;
  color: #c6d6f0;
  word-break: break-all;
}

.copy {
  border: 1px solid var(--docs-line);
  background: var(--docs-panel);
  color: var(--docs-muted);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
}

.copy:hover {
  color: #fff;
  border-color: #334155;
}

.ep-head h2 {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 800;
}

.summary {
  margin: 0;
  color: var(--docs-muted);
  line-height: 1.6;
  font-size: 14px;
}

.block {
  margin-top: 22px;
  padding: 16px 18px;
  border: 1px solid var(--docs-line);
  border-radius: 12px;
  background: rgba(17, 26, 43, 0.72);
}

.block h3 {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 700;
}

.auth-box code {
  display: block;
  padding: 10px 12px;
  border-radius: 8px;
  background: #0a1322;
  color: #9ec1ff;
  font-size: 13px;
}

.scope {
  margin: 10px 0 0;
  color: var(--docs-muted);
  font-size: 13px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid rgba(30, 42, 63, 0.9);
  vertical-align: top;
}

th {
  color: var(--docs-muted);
  font-weight: 600;
  font-size: 12px;
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #b7d0ff;
}

.code {
  margin: 0;
  padding: 14px;
  border-radius: 10px;
  background: #07101d;
  overflow: auto;
  font-size: 12.5px;
  line-height: 1.55;
  color: #d7e6ff;
}

@media (max-width: 900px) {
  .docs {
    grid-template-columns: 1fr;
  }

  .side {
    position: relative;
    height: auto;
    max-height: 42vh;
  }

  .main {
    padding: 20px 16px 48px;
  }
}
</style>
