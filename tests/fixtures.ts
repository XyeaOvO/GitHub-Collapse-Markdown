export const githubReadmeMarkdownFixture = `
  <article class="markdown-body entry-content container-lg" itemprop="text">
    <div class="markdown-heading" dir="auto">
      <h1 tabindex="-1" class="heading-element" dir="auto">Node.js</h1>
      <a id="user-content-nodejs" class="anchor" aria-label="Permalink: Node.js" href="#nodejs">
        <svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg>
      </a>
    </div>
    <p id="intro-copy" dir="auto">Node.js is an open-source, cross-platform JavaScript runtime environment.</p>
    <p dir="auto">For information on using Node.js, see the <a href="https://nodejs.org/" rel="nofollow">Node.js website</a>.</p>
    <div class="markdown-heading" dir="auto">
      <h2 tabindex="-1" class="heading-element" dir="auto">Support</h2>
      <a id="user-content-support" class="anchor" aria-label="Permalink: Support" href="#support">
        <svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg>
      </a>
    </div>
    <p id="support-copy" dir="auto">Looking for help? Check out the instructions for getting support.</p>
    <div class="markdown-heading" dir="auto">
      <h2 tabindex="-1" class="heading-element" dir="auto">Release types</h2>
      <a id="user-content-release-types" class="anchor" aria-label="Permalink: Release types" href="#release-types">
        <svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg>
      </a>
    </div>
    <ul dir="auto">
      <li><strong>Current</strong>: Under active development.</li>
      <li><strong>LTS</strong>: Releases that receive Long Term Support.</li>
      <li><strong>Nightly</strong>: Code from the Current branch built every 24 hours.</li>
    </ul>
    <p id="release-types-copy" dir="auto">Current and LTS releases follow semantic versioning.</p>
    <div class="markdown-heading" dir="auto">
      <h3 tabindex="-1" class="heading-element" dir="auto">Download</h3>
      <a id="user-content-download" class="anchor" aria-label="Permalink: Download" href="#download">
        <svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg>
      </a>
    </div>
    <p id="download-copy" dir="auto">Binaries, installers, and source tarballs are available at nodejs.org.</p>
    <div class="markdown-heading" dir="auto">
      <h4 tabindex="-1" class="heading-element" dir="auto">Current and LTS releases</h4>
      <a id="user-content-current-and-lts-releases" class="anchor" aria-label="Permalink: Current and LTS releases" href="#current-and-lts-releases">
        <svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg>
      </a>
    </div>
    <p id="current-lts-copy" dir="auto">The latest directory is an alias for the latest Current release.</p>
    <div class="markdown-heading" dir="auto">
      <h4 tabindex="-1" class="heading-element" dir="auto">Nightly releases</h4>
      <a id="user-content-nightly-releases" class="anchor" aria-label="Permalink: Nightly releases" href="#nightly-releases">
        <svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg>
      </a>
    </div>
    <p id="nightly-copy" dir="auto">Nightly builds are published every 24 hours.</p>
  </article>
`;

export const githubReadmePageFixture = `
  <header role="banner" style="height: 64px;"></header>
  <main id="repo-content-pjax-container">
    <div class="prc-PageLayout-PageLayoutRoot-xyz" style="display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px;">
      <section class="BlobContent-module__blobContentSection__VOgZq BlobContent-module__blobContentSectionMarkdown__mPLOK">
        <div class="js-snippet-clipboard-copy-unpositioned BlobContent-module__markdownBlob__T8jpG">
          ${githubReadmeMarkdownFixture}
        </div>
      </section>
      <div class="prc-PageLayout-PaneWrapper-pHPop pr-2">
        <div class="prc-PageLayout-Pane-AyzHK rgh-seen-9333986423" style="--spacing: var(--spacing-normal); --pane-width: 320px; height: min-content;">
          <rails-partial data-partial-name="codeViewRepoRoute.Sidebar" class="RailsPartial-module__d-contents__G5m4w">
            <div class="BorderGrid">
              <div class="BorderGrid-row">
                <div class="BorderGrid-cell">
                  <h2 class="tmp-mb-3 h4">About</h2>
                  <p class="f4 tmp-my-3">Sidebar content</p>
                </div>
              </div>
            </div>
          </rails-partial>
        </div>
      </div>
    </div>
  </main>
`;

export const githubCommentPageFixture = `
  <header role="banner" style="height: 64px;"></header>
  <div id="pullrequest-1"></div>
  <div id="issuecomment-1">
    <div class="comment-body markdown-body js-comment-body soft-wrap user-select-contain d-block">
      <div class="markdown-heading" dir="auto">
        <h2 tabindex="-1" class="heading-element" dir="auto">Comment heading</h2>
        <a id="user-content-comment-heading" class="anchor" aria-label="Permalink: Comment heading" href="#comment-heading">
          <svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg>
        </a>
      </div>
      <p id="comment-copy" dir="auto">This is a realistic comment-body wrapper with rendered markdown headings.</p>
      <div class="markdown-heading" dir="auto">
        <h3 tabindex="-1" class="heading-element" dir="auto">Nested comment heading</h3>
        <a id="user-content-nested-comment-heading" class="anchor" aria-label="Permalink: Nested comment heading" href="#nested-comment-heading">
          <svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg>
        </a>
      </div>
      <p id="comment-nested-copy" dir="auto">Nested content inside a PR or issue comment.</p>
    </div>
  </div>
`;

export const githubIssueBodyNestedMarkdownFixture = `
  <header role="banner" style="height: 64px;"></header>
  <main>
    <div data-testid="issue-body" class="react-issue-body">
      <div data-testid="markdown-body" class="markdown-body" data-turbolinks="false">
        <div class="markdown-body NewMarkdownViewer-module__safe-html-box__ZT1eD">
          <h2 dir="auto">Problem</h2>
          <p id="issue-problem-copy" dir="auto">The Hub solidify API has been returning an internal error.</p>
          <h2 dir="auto">Impact</h2>
          <p id="issue-impact-copy" dir="auto">This affects multiple recent cycles.</p>
        </div>
      </div>
    </div>
  </main>
`;

export const gistPageFixture = `
  <header role="banner" style="height: 64px;"></header>
  <main>
    <article class="markdown-body entry-content container-lg" itemprop="text">
      <div class="markdown-heading" dir="auto">
        <h2 tabindex="-1" class="heading-element" dir="auto">ASMR - Anxiety</h2>
        <a id="user-content-asmr-anxiety" class="anchor" aria-label="Permalink: ASMR - Anxiety" href="#asmr-anxiety">
          <svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg>
        </a>
      </div>
      <p id="gist-copy" dir="auto">Rendered Gist markdown content.</p>
      <div class="markdown-heading" dir="auto">
        <h3 tabindex="-1" class="heading-element" dir="auto">Fallen Shadow</h3>
        <a id="user-content-fallen-shadow" class="anchor" aria-label="Permalink: Fallen Shadow" href="#fallen-shadow">
          <svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg>
        </a>
      </div>
      <p id="gist-nested-copy" dir="auto">Nested section inside a gist page.</p>
    </article>
  </main>
`;

export const docsArticleFixture = `
  <div data-container="article">
    <div class="MarkdownContent_markdownBody__v5MYy markdown-body">
      <h2 id="headings" tabindex="-1">
        <a class="heading-link" href="#headings">Headings<span class="heading-link-symbol" aria-hidden="true"></span></a>
      </h2>
      <p id="docs-headings-copy">To create a heading, add one to six # symbols before your heading text.</p>
      <pre><code class="hljs language-markdown"># A first-level heading
## A second-level heading
### A third-level heading</code></pre>
      <h2 id="styling-text" tabindex="-1">
        <a class="heading-link" href="#styling-text">Styling text<span class="heading-link-symbol" aria-hidden="true"></span></a>
      </h2>
      <p id="docs-style-copy">You can indicate emphasis with bold, italic, strikethrough, subscript, or superscript text.</p>
      <table aria-labelledby="styling-text">
        <tbody>
          <tr><td>Bold</td><td><code>** **</code></td></tr>
        </tbody>
      </table>
      <h2 id="quoting-text" tabindex="-1">
        <a class="heading-link" href="#quoting-text">Quoting text<span class="heading-link-symbol" aria-hidden="true"></span></a>
      </h2>
      <p id="docs-quote-copy">You can quote text with a &gt;.</p>
    </div>
  </div>
`;
