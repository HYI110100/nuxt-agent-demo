<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import katex from 'katex'
import mk from '../utils/markdown-it-katex'
import 'highlight.js/styles/github.min.css'
import 'katex/dist/katex.min.css'
import { computed } from 'vue'

const props = defineProps<{
  content: string
  collects?: number[]
  isShowCollect?: boolean
  isDone?: boolean
}>()
const emits = defineEmits(['collect'])

let index = 1
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  highlight: (str, lang) => {
    const codeType = lang || 'plaintext'
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }
    const highlighted: any = lang && hljs.getLanguage(lang)
      ? hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      : escapeHtml(str)
    const codeHeader = ''
    const preTextContent = `<pre data-index="${index}" data-language="${codeType}">${codeHeader}<code class="hljs code_${index}">${highlighted}</code></pre>`
    index++
    return preTextContent
  },
})

md.use((md) => {
  md.core.ruler.before('normalize', 'my_hook', () => {
    index = 1
    return true // 继续执行后续规则
  })
})
md.use(mk, {
  inlineDelimiters: ['$', ['$ ', ' $'], ['\\(', '\\)'], ['\\( ', ' \\)']],
  blockDelimiters: ['$$', ['\\[', '\\]'], ['\\[ ', ' \\]']],
  inlineRenderer: src => katex.renderToString(src, { throwOnError: false }),
  blockRenderer: src => `<div>${katex.renderToString(src, { throwOnError: false })}</div>`,
})

const contentHtml = computed(() => props.content ? md.render(props.content) : '')

// 暴露获取 HTML 的方法
defineExpose({
  getHtml: () => contentHtml.value,
})
</script>

<template>
  <div class="markdown-content">
    <div v-html="contentHtml" />
  </div>
</template>

<style lang="scss">
.markdown-content {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-size: revert;
    font-weight: revert;
    margin: revert;
  }
  margin-top: 14px;
}

/* 有序列表样式 */
.markdown-content ol {
  counter-reset: formula-counter;
  list-style-type: decimal;
  padding-left: 2.5em;
  margin: 1em 0;
}
.markdown-content  p{
   margin-left: 18px;
}
.markdown-content pre code {
  background: #F7F7F7;
  padding-left: 32px;
  padding-left:30px;
  padding-top: 5px;
  padding-bottom:10px;
  border: 1px solid #D9D9D9;
  border-bottom-left-radius: 16px;
 border-bottom-right-radius: 16px;
}

.markdown-content pre {
  //  border-radius: 6px;
   overflow: hidden;
   margin-top: 11px;
   margin-bottom: 11px;

}
.markdown-content pre .code-header {
background: #F7F7F7;
 border: 1px solid #D9D9D9;
 border-bottom: none;
border-top-left-radius: 16px;
border-top-right-radius: 16px;
 padding:10px 30px 12px 32px;
}

.markdown-content ol li {
  margin: 0.5em 0;
  line-height: 1.8;
}

/* 无序列表样式 */
.markdown-content ul {
  list-style-type: disc;
  padding-left: 2em;
  margin: 1em 0;
}

.markdown-content ul li {
  margin: 0.5em 0;
  line-height: 1.8;
}

/* 嵌套列表样式 */
.markdown-content ul ul,
.markdown-content ol ul {
  list-style-type: circle;
  margin: 0.3em 0;
}
.hljs-doctag, .hljs-keyword, .hljs-meta .hljs-keyword, .hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-variable.language_ {
    color: #D03050;
}
.hljs-title, .hljs-title.class_, .hljs-title.class_.inherited__, .hljs-title.function_ {
    color: #944ED5;
}
.hljs-meta .hljs-string, .hljs-regexp, .hljs-string {
    color: #2080F0;
}
.hljs-code, .hljs-comment, .hljs-formula {
    color: #A3A3A3;
}
</style>
