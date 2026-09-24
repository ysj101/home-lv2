import { quote } from '@/db/seed/sql'
import type { TaskCategory } from '@/lib/task-category'

type TaskTemplateSeed = {
  /**
   * seed が冪等に upsert できるよう、採番ではなく安定したスラッグを ID にする。
   * 一度リリースした ID は変更しないこと（変更すると別テンプレート扱いになる）。
   */
  id: string
  title: string
  description: string
  category: TaskCategory
  /** 引越し日からの相対日数。引越し前はマイナス、後はプラス。 */
  offsetDays: number
}

/**
 * 引越し日を基準に自動生成する標準 TODO（docs/spec.md §11 UC-02）。
 * 配列の並びがそのまま `sort_order` になるので、期限の早い順に並べる。
 */
export const TASK_TEMPLATE_SEEDS: TaskTemplateSeed[] = [
  {
    id: 'moving-company-estimate',
    title: '引越し業者の見積もりを取る',
    description: '複数社から相見積もりを取り、料金とサービス内容を比較する。',
    category: 'moving-company',
    offsetDays: -60,
  },
  {
    id: 'moving-company-contract',
    title: '引越し業者を決めて契約する',
    description: '希望日を押さえる。繁忙期は早めに確定させる。',
    category: 'moving-company',
    offsetDays: -45,
  },
  {
    id: 'budget-check',
    title: '引越し費用の予算を確認する',
    description: '業者費用・敷金礼金・家具家電・当面の生活費を洗い出す。',
    category: 'finance',
    offsetDays: -45,
  },
  {
    id: 'new-home-layout',
    title: '新居の採寸と家具配置を決める',
    description: '各部屋のサイズと搬入経路を測り、手持ちの家具が入るか確認する。',
    category: 'home',
    offsetDays: -40,
  },
  {
    id: 'dispose-unused-items',
    title: '不用品を処分する',
    description: '粗大ごみの回収は予約が必要なことが多いので早めに動く。',
    category: 'home',
    offsetDays: -35,
  },
  {
    id: 'child-school-transfer',
    title: '転園・転校の手続きを確認する',
    description: '現在の園・学校に連絡し、必要書類と提出期限を確認する。',
    category: 'child',
    offsetDays: -30,
  },
  {
    id: 'internet-transfer',
    title: 'インターネット回線の移転を申し込む',
    description: '工事が必要な場合は日程が埋まりやすいので早めに申し込む。',
    category: 'utility',
    offsetDays: -30,
  },
  {
    id: 'curtains-and-lighting',
    title: 'カーテンと照明を手配する',
    description: '入居初日に必要になるため、採寸結果をもとに先に注文する。',
    category: 'home',
    offsetDays: -25,
  },
  {
    id: 'packing-start',
    title: '荷造りを始める（普段使わないものから）',
    description: 'オフシーズンの衣類・書籍・来客用品などから順に箱詰めする。',
    category: 'packing',
    offsetDays: -21,
  },
  {
    id: 'school-supplies',
    title: '子どもの持ち物・制服を準備する',
    description: '転校先で必要なものを確認し、不足分を手配する。',
    category: 'child',
    offsetDays: -21,
  },
  {
    id: 'electricity',
    title: '電気の停止・開始手続き',
    description: '旧居の停止日と新居の使用開始日を電力会社に連絡する。',
    category: 'utility',
    offsetDays: -7,
  },
  {
    id: 'gas',
    title: 'ガスの停止・開始手続き',
    description: '新居の開栓は立ち会いが必要。日時を予約しておく。',
    category: 'utility',
    offsetDays: -7,
  },
  {
    id: 'water',
    title: '水道の停止・開始手続き',
    description: '旧居の停止日と新居の使用開始日を水道局に連絡する。',
    category: 'utility',
    offsetDays: -7,
  },
  {
    id: 'moving-out-notification',
    title: '転出届を提出する',
    description: '旧住所の役所へ。引越しの14日前から提出できる。',
    category: 'administrative',
    offsetDays: -7,
  },
  {
    id: 'mail-forwarding',
    title: '郵便物の転送届を出す',
    description: '旧住所宛の郵便物を1年間新住所へ転送してもらう。',
    category: 'address-change',
    offsetDays: -7,
  },
  {
    id: 'insurance-address-change',
    title: '火災保険・地震保険の住所変更',
    description: '新居の契約内容も合わせて見直す。',
    category: 'finance',
    offsetDays: -7,
  },
  {
    id: 'subscription-address-change',
    title: '新聞・定期配送サービスの住所変更',
    description: '定期購入や宅配サービスの配送先を変更する。',
    category: 'address-change',
    offsetDays: -5,
  },
  {
    id: 'appliance-drain',
    title: '冷蔵庫と洗濯機の水抜きをする',
    description: '運搬前日までに電源を抜き、霜取りと水抜きを済ませる。',
    category: 'home',
    offsetDays: -2,
  },
  {
    id: 'packing-finish',
    title: '荷造りを終わらせる',
    description: '当日すぐ使うものは別の箱にまとめ、すぐ開けられるようにする。',
    category: 'packing',
    offsetDays: -1,
  },
  {
    id: 'old-home-cleaning',
    title: '旧居の掃除と退去立ち会い',
    description: '管理会社との立ち会いで原状回復の範囲を確認する。',
    category: 'home',
    offsetDays: 0,
  },
  {
    id: 'new-home-keys',
    title: '新居の鍵を受け取る',
    description: '受け取り時に設備の動作と傷の有無を確認しておく。',
    category: 'home',
    offsetDays: 0,
  },
  {
    id: 'moving-in-notification',
    title: '転入届を提出する',
    description: '新住所の役所へ。引越しから14日以内に提出する。',
    category: 'administrative',
    offsetDays: 7,
  },
  {
    id: 'my-number-address-change',
    title: 'マイナンバーカードの住所変更',
    description: '転入届と同時に手続きできる。家族全員分が必要。',
    category: 'administrative',
    offsetDays: 7,
  },
  {
    id: 'drivers-license-address-change',
    title: '運転免許証の住所変更',
    description: '警察署または運転免許センターで手続きする。',
    category: 'address-change',
    offsetDays: 14,
  },
  {
    id: 'bank-card-address-change',
    title: '銀行・クレジットカードの住所変更',
    description: '給与振込口座や公共料金の引き落とし口座を優先する。',
    category: 'address-change',
    offsetDays: 14,
  },
]

/**
 * 標準テンプレートを投入する SQL を組み立てる。
 *
 * ID を固定しているので、再実行しても行は増えない。内容を変更した場合は
 * `DO UPDATE` で既存行に反映される（seed を唯一の定義元として扱う）。
 */
export function buildTaskTemplateSeedStatements(
  seeds: TaskTemplateSeed[] = TASK_TEMPLATE_SEEDS,
): string[] {
  return seeds.map((seed, index) => {
    const sortOrder = index + 1

    return [
      'INSERT INTO task_templates (id, title, description, category, offset_days, sort_order)',
      `VALUES (${quote(seed.id)}, ${quote(seed.title)}, ${quote(seed.description)}, ${quote(seed.category)}, ${seed.offsetDays}, ${sortOrder})`,
      'ON CONFLICT(id) DO UPDATE SET',
      'title = excluded.title, description = excluded.description,',
      'category = excluded.category, offset_days = excluded.offset_days,',
      'sort_order = excluded.sort_order, updated_at = (unixepoch() * 1000);',
    ].join(' ')
  })
}
