# AI VTuber — Claude Code ルール

## Git ワークフロー

- **masterブランチへの直接pushは禁止**（GitHub側でブランチ保護が設定済み）
- コード変更は必ず**フィーチャーブランチを作成**してから作業すること
- 作業完了後は**PRを作成**してマージする

```bash
# 正しいフロー
git checkout -b feature/xxx
# ... 作業 ...
git add <files>
git commit -m "feat: ..."
git push origin feature/xxx
gh pr create ...
```

## ブランチ命名規則

| 種類 | 命名 |
|--|--|
| 機能追加 | `feat/xxx` |
| バグ修正 | `fix/xxx` |
| CI/設定変更 | `ci/xxx` または `chore/xxx` |
| テスト | `test/xxx` |
| Issue対応 | `feat/issue-{番号}` |

## プロジェクト概要

Next.js 15.5 + React 19 で構築したAI VTuber MVP。
詳細は `.claude/memory/project_aivtuber_mvp.md` を参照。
