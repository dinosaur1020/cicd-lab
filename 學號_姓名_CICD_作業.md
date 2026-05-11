<!--
  繳交前請：
  1. 將本檔重新命名為：學號_姓名_CICD_作業.md（再轉成 PDF）
  2. 全文搜尋並取代下方佔位符：[學號]、[姓名]
  3. 於標示「（請插入截圖）」處贴上你的 GitHub Actions 截圖
-->

# 雲原生 CI/CD 作業報告

## B12705026 丁崇耘


### 一、CI Pipeline 說明

本專案在 GitHub 上以 **GitHub Actions** 建立獨立作業用 workflow。此 pipeline 在 **`git push` 至任一分支時自動觸發**，於 `ubuntu-latest` 上執行下列檢查：

1. **TypeScript typecheck**：執行 `npm run typecheck`（等同 `tsc --noEmit`），在不通過編譯／型別檢查時以非零離開碼結束。
2. **Prettier check**：執行 `npm run format:check`，以專案設定的 Prettier 規則檢查格式，不符合則失敗。
3. **Test**：以 **Vitest** 執行單元測試，並使用 **JUnit XML** 報表寫入 `test-results/junit.xml`。

**失敗行為**：上述任一步驟失敗時，該 job 即為失敗，GitHub Actions  run 會顯示為失敗（紅色），符合「任一檢查失敗時 pipeline 顯示失敗」之要求。

**測試結果呈現**：使用 Marketplace 上的現成 Action **[EnricoMi/publish-unit-test-result-action](https://github.com/EnricoMi/publish-unit-test-result-action)**（`@v2`）讀取 JUnit 檔，將結果發布至該次 run 的 **Job summary** 與 **Checks**（此 action 建立名為 `Vitest results` 的 check）。若測試步驟因前置步驟失敗而未執行，則不會產生 `junit.xml`，發布步驟會透過 `hashFiles` 條件略過，避免誤報。

**權限**：`contents: read` 供 checkout／讀取程式；`checks: write` 供發布測試結果至 GitHub Checks API。`comment_mode: off` 可避免在純 push 流程中需要額外 PR 留言權限。

---

### 二、`.github/workflows/ci_<學號>.yaml` 主要內容

以下為作業用 workflow 的完整內容（繳交前請確認檔名已改為 `ci_<你的學號>.yaml`，並可將 `name: CI homework` 改為易辨識的名稱）。

```yaml
# 繳交前請將檔名改為 ci_<你的學號>.yaml（本檔 000000000 為範例占位）
name: CI homework

on:
  push:

permissions:
  contents: read
  checks: write

jobs:
  ci:
    name: Typecheck, Prettier, Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Setup Node.js
        uses: actions/setup-node@v5
        with:
          node-version: '22'
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: TypeScript typecheck
        run: npm run typecheck

      - name: Prettier check
        run: npm run format:check

      - name: Test (Vitest + JUnit)
        run: |
          mkdir -p test-results
          npx vitest run --reporter=default --reporter=junit --outputFile=test-results/junit.xml

      - name: Publish test results (job summary + Checks)
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: (!cancelled()) && hashFiles('test-results/junit.xml') != ''
        with:
          files: test-results/junit.xml
          check_name: Vitest results
          comment_mode: off
          fail_on: 'test failures'
          action_fail: false
```

---

## 三、Pipeline 設計說明（工具與策略）

| 設計要點 | 說明 |
|----------|------|
| **觸發條件** | 僅設定 `on: push`，符合「push 時自動執行」；所有分支 push 皆會觸發。 |
| **執行環境** | `ubuntu-latest`，與常見 Node 專案 CI 一致。 |
| **Node 版本** | `actions/setup-node@v5` 固定 `node-version: '22'`，與專案 `package.json` 的 `engines.node`（`>=22 <25`）一致。 |
| **依賴安裝** | `npm ci` 依 lockfile 可重現安裝，適合 CI。 |
| **檢查順序** | 先型別、再格式、最後測試：越早失敗越早停止後續步驟，節省 runner 時間。 |
| **測試報表** | Vitest 同時使用 `default`（主控台可讀）與 `junit`（`--outputFile=test-results/junit.xml`），兼顧 log 與標準 JUnit 交換格式。 |
| **發布測試結果** | 採官方文件建議的 `if: (!cancelled())`，在測試步驟失敗時仍會執行發布（若有 junit 檔），便於在 Actions 上檢視失敗案例；`action_fail: false` 避免「發布」步驟額外改變成敗語意——**整體 job 成敗仍由 typecheck／prettier／test 決定**。 |
| **快取** | `cache: npm` 加速重複執行。 |

---

## 四、CI 執行結果（成功）

請於推送程式至 GitHub 後，於 **Repository → Actions** 開啟本次作業 workflow 的**成功** run，截取至少一張圖，建議包含：

- 左側 workflow 名稱與綠色成功狀態；或
- 單一 job 內各步驟皆成功的列表；以及（若可見）
- **Job summary** 或 **Checks** 中由 `publish-unit-test-result-action` 產生的測試摘要。

**（請插入截圖：至少一張成功執行的 GitHub Actions 結果畫面）**

> _圖說建議：註明 repo 名稱、workflow 名稱、run 編號與執行時間。_

---

### 五、失敗案例說明

以下擇一（或多個）人為製造錯誤以展示 pipeline 失敗與排查方式。實際繳交時請**在截圖對應到你故意推上的那一版**，修正後可再附一張成功 run 作為對照（若作業未要求可不附）。

#### 5.1 範例 A：TypeScript 型別錯誤

- **作法**：例如在 `src/app.ts` 暫時加入 `const _demo: string = 1;` 等無法通過型別檢查的程式碼，commit 並 push。
- **預期**：`TypeScript typecheck` 步驟失敗，整體 workflow 失敗。
- **原因**：`tsc --noEmit` 報告型別不相容。
- **修正**：刪除或改正該行程式，使 `npm run typecheck` 本地通過後再 push。

**（請插入截圖：此情境下 pipeline failed 的 Actions 畫面）**

---

#### 5.2 範例 B：Prettier 格式錯誤

- **作法**：故意破壞某個已受 Prettier 檢查的檔案格式（例如註解掉分號、任意縮排），未執行 `npm run format` 即 push。
- **預期**：`Prettier check` 步驟失敗。
- **原因**：`prettier --check` 發現與格式化結果不一致。
- **修正**：執行 `npm run format`（或手動還原為符合規範的內容）後再 commit／push。

**（請插入截圖：此情境下 pipeline failed 的 Actions 畫面）**  
_（若你採用範例 A 作為唯一失敗案例，本節可刪圖或改為「未採用」。）_

---

#### 5.3 範例 C：測試失敗

- **作法**：例如在 `test/app.test.ts` 暫時將某斷言改為錯誤預期（如 `expect(response.statusCode).toBe(999)`），push。
- **預期**：`Test (Vitest + JUnit)` 失敗；若有產生 `junit.xml`，可在 Job summary／Checks 裡看到失敗案例。
- **原因**：Vitest 偵測斷言失敗，程序以非零離開碼結束。
- **修正**：還原正確斷言，本地 `npm test` 通過後再 push。

**（請插入截圖：此情境下 pipeline failed 的 Actions 畫面）**  
_（若你採用範例 A 作為唯一失敗案例，本節可刪圖或改為「未採用」。）_

---

### 六、小結

本作業透過 GitHub Actions 將 **TypeScript typecheck、Prettier、Vitest 測試** 串成單一 CI job，於 **push** 時自動執行；任一步失敗即反映為 run 失敗。測試結果藉由 **JUnit** 與 **publish-unit-test-result-action** 顯示於 GitHub Actions 介面，便於檢視通過／失敗案例與除錯。

---

_匯出 PDF 時，建議使用與作業要求一致之檔名：`學號_姓名_CICD_作業.pdf`。_
