# Home Lv.2 — Product Specification

## 1. Overview

**Home Lv.2** は、家族3人の引越し準備を「次の暮らしへのレベルアップ」として管理するWebアプリケーション。

現在の住まいが家族にとって手狭になってきたことをきっかけに、より広い新居への引越しを、夫婦2人で協力して進める。

引越し日を起点として必要なTODOを自動生成し、各タスクの期限・担当者・完了状況を共有する。

単なるTODOアプリではなく、引越しをひとつの「クエスト」と捉え、進捗が見える・達成感があるUIを目指す。

MVPは必要最小限の機能に限定するが、将来的に以下へ拡張できるアーキテクチャとする。

- 書類・画像管理
- リマインダー
- 非同期通知
- リアルタイム同期
- AIによるタスク提案
- 引越し後の新生活タスク管理
- 家族イベント管理への拡張

---

## 2. Product Concept

### Tagline

> **家族の暮らしを、次のレベルへ。**

### Story

Home Lv.2 における引越しは、単なる住所変更ではない。

家族3人の生活が成長し、現在の住まいが手狭になってきたことをきっかけに、より快適な暮らしへ移行するプロジェクトである。

アプリ内では、引越し全体を「Main Quest」、個々のTODOを「Quest」として表現できる。

ただしゲーム表現はUI上の演出に留め、データモデルや業務ロジックでは一般的な `Task` 等の用語を使用する。

---

## 3. Goals

### Primary Goal

夫婦2人が以下を一箇所で把握できるようにする。

- 何をやる必要があるか
- いつまでにやる必要があるか
- 誰が担当するか
- 何が終わっているか
- 引越し全体がどこまで進んでいるか

### Secondary Goal

Cloudflare Developer PlatformとモダンなWeb技術を実践的に学ぶ。

学習対象：

- TanStack Start
- React
- TypeScript
- Vite
- Cloudflare Workers
- Cloudflare Access
- Cloudflare D1
- Drizzle ORM
- Tailwind CSS
- shadcn/ui

将来的には以下も扱う。

- Cloudflare R2
- Cloudflare Workflows
- Cloudflare Queues
- Durable Objects
- Workers AI

---

## 4. Users

家族構成は3人。

- Adult A
- Adult B
- Child

MVPでアプリへアクセスするのはAdult A / Adult Bの2人のみ。

Child用ログインやChild向けアカウントは作らない。

第三者からのアクセスも許可しない。

---

## 5. Authentication / Authorization

認証はアプリケーション内部では実装せず、Cloudflare Accessを利用する。

```text
Internet
   │
   ▼
Cloudflare Access
   │
   ├─ Adult A Email → Allow
   ├─ Adult B Email → Allow
   └─ Other         → Deny
   │
   ▼
Home Lv.2
```

### Authentication Method

MVPではCloudflare Accessによる認証を利用する。

Access PolicyにはAdult A / Adult Bのメールアドレスのみ登録する。

### Application User

Cloudflare Accessで認証していても、アプリケーション内部にはUserを保持する。

目的：

- タスク担当者
- タスク完了者
- 将来の通知先
- 操作履歴
- Householdとの関連付け

認証済みメールアドレスをUserレコードと紐付ける。

---

## 6. MVP Architecture

```text
                    Browser
                       │
                       ▼
               Cloudflare Access
                2 adults only
                       │
                       ▼
                TanStack Start
                       │
              React / TypeScript
              Tailwind / shadcn
                       │
                Server Functions
                       │
                       ▼
                  Drizzle ORM
                       │
                       ▼
                 Cloudflare D1
```

---

## 7. Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers |
| Full-stack Framework | TanStack Start |
| Frontend | React |
| Language | TypeScript |
| Build | Vite |
| Cloudflare Integration | @cloudflare/vite-plugin |
| UI Components | shadcn/ui |
| CSS | Tailwind CSS |
| Authentication | Cloudflare Access |
| Database | Cloudflare D1 |
| ORM | Drizzle ORM |
| Package Manager | pnpm |
| Unit Test | Vitest |
| E2E Test | Playwright |
| Deployment | Wrangler |

---

## 8. Domain Model

```text
User
 │
 ▼
HouseholdMember
 │
 ▼
Household
 │
 ▼
Move
 │
 ├────────── Task
 │
 └────────── TaskTemplate
```

MVPではHouseholdは1件。

```text
Household
└─ Our Family
   ├─ Adult A
   ├─ Adult B
   └─ Child
```

ChildはHouseholdの構成員として概念上存在するが、MVPではUserアカウントを持たない。

将来的に家族情報をより詳細に扱う場合は `persons` / `household_people` のようなモデルを追加する。

---

## 9. Database Schema

### users

アプリへログイン可能な利用者。

```text
id
email
name
created_at
updated_at
```

`email` はunique。

---

### households

```text
id
name
created_at
updated_at
```

---

### household_members

ログインユーザーとHouseholdの関連。

```text
household_id
user_id
role
created_at
```

MVPではroleは `member` のみでよい。

将来的には以下へ拡張可能。

```text
owner
member
```

---

### moves

```text
id
household_id
name
move_date
old_address
new_address
created_at
updated_at
```

例：

```text
name:
Home Lv.2

move_date:
2026-11-15
```

---

### tasks

```text
id
move_id
title
description
category
due_date
assignee_id
status
source
template_id
completed_at
completed_by
created_at
updated_at
```

#### status

MVP：

```text
todo
completed
```

将来的には以下へ拡張可能。

```text
todo
in_progress
blocked
completed
```

#### source

```text
template
manual
```

引越し日変更時に、テンプレート由来のタスクだけ期限再計算できるようにする。

---

### task_templates

```text
id
title
description
category
offset_days
sort_order
created_at
updated_at
```

例：

```text
title:
電気停止手続き

offset_days:
-7
```

引越し日が2026-11-15なら、Taskの期限は2026-11-08となる。

---

## 10. Task Categories

MVP標準カテゴリ：

```text
administrative
utility
moving-company
packing
home
finance
address-change
child
other
```

UIでは日本語表示する。

例：

```text
administrative   → 行政手続き
utility          → 電気・ガス・水道
moving-company   → 引越し業者
packing          → 荷造り
child            → 子ども関連
```

---

## 11. Core Use Cases

### UC-01 引越しを登録する

入力：

```text
引越し名
引越し日
旧住所
新住所
```

登録時にTaskTemplateを使用して標準TODOを生成する。

---

### UC-02 TODOを自動生成する

```text
Move.move_date
+
TaskTemplate.offset_days
=
Task.due_date
```

計算：

```text
dueDate = moveDate + offsetDays
```

---

### UC-03 タスクを追加する

入力：

```text
title
description
category
dueDate
assignee
```

---

### UC-04 担当者を設定する

選択肢：

```text
未割当
Adult A
Adult B
```

---

### UC-05 タスクを完了する

完了時：

```text
status = completed
completed_at = current time
completed_by = current user
```

---

### UC-06 タスクを再オープンする

```text
status = todo
completed_at = null
completed_by = null
```

---

### UC-07 引越し日を変更する

引越し日を変更した場合、`source = template` の未完了タスクについて期限を再計算できるようにする。

MVPでは自動更新せず、変更対象を表示してユーザーが確認後に一括更新する。

---

## 12. Screens

### 12.1 Dashboard

Home Lv.2 のメイン画面。

例：

```text
HOME Lv.2

Main Quest
新居への引越し

引越しまで
あと 54 日

Progress
████████░░ 80%

32 Quests Cleared
8 Quests Remaining
2 Overdue
```

さらに以下を表示する。

```text
今日やること
今週やること
期限超過
最近完了したタスク
```

ゲーム表現は補助的に使い、視認性と実用性を優先する。

---

### 12.2 Task List

すべてのタスクを一覧表示する。

例：

```text
□ 電気停止手続き

期限
11/8

担当
Adult B

カテゴリ
電気・ガス・水道
```

フィルター：

```text
すべて
未完了
完了
期限超過

担当：自分
担当：相手

カテゴリ
```

---

### 12.3 Task Detail

表示・編集：

```text
タイトル
説明
期限
カテゴリ
担当者
ステータス
```

---

### 12.4 Move Settings

編集項目：

```text
引越し名
引越し日
旧住所
新住所
```

---

## 13. Dashboard Logic

### Moving Countdown

```text
moveDate - today
```

### Progress

```text
completedTasks / totalTasks
```

### Overdue

```text
due_date < today
AND
status != completed
```

### Upcoming

```text
today <= due_date <= today + 7 days
AND
status != completed
```

---

## 14. Server Functions

Routeから直接D1を操作しない。

```text
Route
  ↓
Feature / Use Case
  ↓
Repository / Database
```

例：

```text
createMove()
updateMove()
getMove()

getTasks()
createTask()
updateTask()
deleteTask()

assignTask()
completeTask()
reopenTask()

generateTasksFromTemplates()
recalculateTemplateTaskDueDates()
```

将来的に副作用を追加してもUse Case側を拡張できるようにする。

例：

```text
completeTask()
   │
   ├─ D1 update
   ├─ Queue event
   └─ Realtime notification
```

---

## 15. Directory Structure

```text
src/
├── routes/
│   ├── __root.tsx
│   ├── index.tsx
│   ├── tasks.tsx
│   ├── tasks.$id.tsx
│   └── settings.tsx
│
├── features/
│   ├── auth/
│   │   └── get-current-user.ts
│   │
│   ├── move/
│   │   ├── create-move.ts
│   │   ├── update-move.ts
│   │   └── get-move.ts
│   │
│   └── task/
│       ├── get-tasks.ts
│       ├── create-task.ts
│       ├── update-task.ts
│       ├── delete-task.ts
│       ├── complete-task.ts
│       ├── reopen-task.ts
│       ├── assign-task.ts
│       ├── generate-tasks.ts
│       └── recalculate-due-dates.ts
│
├── db/
│   ├── client.ts
│   ├── schema.ts
│   └── migrations/
│
├── components/
├── lib/
└── styles/
```

---

## 16. MVP Scope

### Included

- Cloudflare AccessによるAdult A / Adult B限定アクセス
- Cloudflare Accessから現在ユーザーを特定
- Household
- Move登録・編集
- 引越し日登録
- TaskTemplate
- TODO自動生成
- TODO一覧
- TODO追加
- TODO編集
- TODO削除
- 担当者設定
- 完了・未完了切り替え
- Dashboard
- 進捗率
- 引越しまでの日数
- 期限超過表示
- 今週のタスク表示
- スマートフォン対応

---

## 17. Explicitly Out of Scope for MVP

```text
Better Auth
R2
Workflows
Queues
Durable Objects
WebSocket
Workers AI
Push通知
メール通知
ファイルアップロード
コメント
監査ログ
一般ユーザー登録
Child向けアカウント
ネイティブアプリ
```

---

## 18. Future Architecture

```text
                         Cloudflare Access
                                │
                                ▼
                         TanStack Start
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
             D1                R2             Workflows
              │                                   │
              │                                   ▼
              │                                Queues
              │                                   │
              │                              Notifications
              │
              ▼
       Durable Objects

       Realtime Sync


              Workers AI

        Task Recommendations
```

---

## 19. Phase 2 — Documents

Cloudflare R2を導入する。

保存対象例：

```text
引越し業者見積書
賃貸契約書
新居間取り
家電資料
退去時写真
```

追加テーブル：

```text
attachments

id
task_id
r2_key
filename
content_type
uploaded_by
created_at
```

---

## 20. Phase 3 — Reminder

Cloudflare Workflowsを利用する。

例：

```text
Task created
     ↓
期限3日前まで待機
     ↓
Task completed?
 ├─ YES → End
 └─ NO
      ↓
 Notification
```

---

## 21. Phase 4 — Async Events

Cloudflare Queuesを利用する。

```text
Task
 ↓
Workflow
 ↓
Queue
 ├─ Email
 └─ Push Notification
```

アプリ本体と通知処理を疎結合にする。

---

## 22. Phase 5 — Realtime Collaboration

Durable Objects + WebSocketを利用する。

```text
Adult A Browser
      │
      ▼
Durable Object
      ▲
      │
Adult B Browser
```

片方がタスクを更新すると、もう一方の画面にも反映する。

MVPでは再フェッチで十分とする。

---

## 23. Phase 6 — AI

Workers AI等を利用してTODO提案機能を追加する。

入力例：

```text
3人家族
子どもあり
賃貸 → 新居
東京都 → 愛知県
車あり
ガスあり
光回線あり
```

提案例：

```text
転出届
転入届
児童関連住所変更
免許証住所変更
車庫証明
自動車登録変更
電気手続き
ガス手続き
インターネット移転
```

必須タスク判定をLLMだけに依存させない。

```text
Rule Engine
+
TaskTemplate
+
AI Suggestion
```

の構成とする。

---

## 24. Design Principles

### Simple First

MVPではCloudflareサービスを不必要に追加しない。

### Serverless Native

Cloudflare Workers上で自然に動作する構成を優先する。

### Type Safe

可能な限り以下をTypeScriptで型安全に接続する。

```text
Database
↓
Server
↓
Frontend
```

### Domain Logic Outside Routes

業務ロジックをRoute Componentへ直接書かない。

### Progressive Architecture

```text
D1
 ↓
R2
 ↓
Workflows
 ↓
Queues
 ↓
Durable Objects
 ↓
AI
```

の順で、必要になったタイミングで追加する。

### Playful, Not Gimmicky

Home Lv.2 の世界観として、

```text
Move       → Main Quest
Task       → Quest
Completed  → Cleared
Progress   → Level Progress
```

などの表現をUIに使用できる。

ただし操作性を犠牲にするほどゲーム化しない。

---

## 25. Non-Functional Requirements

### Security

- Cloudflare Access必須
- 許可メールアドレスはAdult A / Adult Bの2件のみ
- D1へブラウザから直接アクセスさせない
- Server Functions経由でデータ操作
- 認証ユーザーをサーバー側で検証する

### Performance

利用者2人のため、高トラフィック向け最適化は不要。

### Mobile First

引越し準備中はスマートフォンからの利用が多いことを想定し、モバイル操作を優先する。

### Data Integrity

- Userが所属するHousehold以外のデータへアクセスできない
- 完了操作は実行ユーザーを記録する
- テンプレート生成タスクと手動タスクを区別する

---

## 26. MVP Acceptance Criteria

MVP完成条件：

1. Adult A / Adult B以外はアプリへアクセスできない
2. Cloudflare Accessのユーザーをアプリ内Userとして認識できる
3. 引越し日を登録できる
4. TaskTemplateからTODOが生成される
5. TODOに期限が設定される
6. TODOを手動追加できる
7. TODOを編集できる
8. TODOを削除できる
9. Adult A / Adult Bを担当として設定できる
10. TODOを完了できる
11. 完了したユーザーを記録できる
12. Dashboardで進捗率を確認できる
13. 引越しまでの日数を確認できる
14. 期限超過タスクを確認できる
15. 今週のタスクを確認できる
16. スマートフォンから問題なく操作できる
17. Cloudflare Workersへ本番デプロイできる

---

## 27. Initial Development Order

```text
1. TanStack Start + Cloudflareプロジェクト作成
2. D1セットアップ
3. Drizzleセットアップ
4. DB schema作成
5. Cloudflare Access設定
6. Current User取得
7. Household初期データ
8. Move CRUD
9. TaskTemplate作成
10. Task自動生成
11. Task CRUD
12. 担当者機能
13. Dashboard
14. Responsive UI
15. Test
16. Production Deploy
```

---

## 28. Naming

### Service Name

```text
Home Lv.2
```

### Repository

推奨：

```text
home-lv2
```

理由：

- サービス名と一致する
- 短い
- CLIで扱いやすい
- GitHub上で読みやすい
- Worker名や関連リソース名へ展開しやすい

### Cloudflare Worker

```text
home-lv2
```

### D1 Database

```text
home-lv2-db
```

### Future Resources

```text
home-lv2-files
home-lv2-events
home-lv2-notifications
```

---

## 29. MVP Definition

Home Lv.2 のMVPは、

> 引越し日を登録すると必要なQuestが生成され、夫婦2人で担当を決め、完了状況と期限を共有しながら、家族3人の「Home Lv.2」への進捗を確認できる。

状態を完成とする。

通知・AI・ファイル管理・リアルタイム同期はMVP完成後に追加する。
