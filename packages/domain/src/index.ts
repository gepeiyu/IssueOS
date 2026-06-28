/**
 * @issueos/domain — 核心对象模型
 *
 * 定义 IssueOS 工作流中的核心领域对象（Project / Issue / Spec / Plan / Task /
 * Agent / Review / Knowledge）的 TypeScript 类型，以及状态枚举与 provenance 辅助函数。
 *
 * 本模块刻意保持 runtime-free：只导出类型、字符串联合类型的常量数组，
 * 以及 `makeProvenance` / `newId` 两个纯函数，供下游命令复用。
 */

/** 所有核心对象的公共基础字段。 */
export interface DomainObjectBase {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  /**
   * provenance 记录该对象的来源命令与上游对象 id，用于跨命令链路追溯。
   * sourceCommand 取值为 `/spec` / `/plan` / `/task` / `/review`。
   */
  provenance: Provenance;
}

/** 来源命令枚举。 */
export type SourceCommand = '/spec' | '/plan' | '/task' | '/review';

export const SOURCE_COMMANDS: readonly SourceCommand[] = ['/spec', '/plan', '/task', '/review'] as const;

/** provenance：记录对象由哪条命令产生、上游对象 id（可选）。 */
export interface Provenance {
  sourceCommand: SourceCommand;
  /** 上游对象的 id，例如 Plan 由 Spec 生成时记录 specId。 */
  upstreamId?: string;
}

/** Spec 生命周期状态。 */
export type SpecStatus = 'draft' | 'generated' | 'reviewed' | 'superseded';
export const SPEC_STATUSES: readonly SpecStatus[] = ['draft', 'generated', 'reviewed', 'superseded'] as const;

/** Plan 生命周期状态。 */
export type PlanStatus = 'draft' | 'generated' | 'reviewed' | 'superseded';
export const PLAN_STATUSES: readonly PlanStatus[] = ['draft', 'generated', 'reviewed', 'superseded'] as const;

/** Task 生命周期状态。 */
export type TaskStatus = 'draft' | 'generated' | 'started' | 'done' | 'superseded' | 'failed';
export const TASK_STATUSES: readonly TaskStatus[] = [
  'draft',
  'generated',
  'started',
  'done',
  'superseded',
  'failed',
] as const;

/** Review 的评审状态。 */
export type ReviewStatus = 'draft' | 'generated' | 'accepted' | 'rejected' | 'superseded';
export const REVIEW_STATUSES: readonly ReviewStatus[] = [
  'draft',
  'generated',
  'accepted',
  'rejected',
  'superseded',
] as const;

/** Review 的评审目标类型。 */
export type ReviewTargetType = 'spec' | 'plan' | 'task' | 'issue';
export const REVIEW_TARGET_TYPES: readonly ReviewTargetType[] = ['spec', 'plan', 'task', 'issue'] as const;

/** Project：一个项目，承载其下所有 Issue / Spec / Plan 等。 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/** Issue：结构化的需求来源，含 DSL 字段（详见 issue-dsl 模块）。 */
export interface Issue extends DomainObjectBase {
  title: string;
  background?: string;
  goal: string;
  scope: string[];
  outOfScope?: string[];
  acceptance: string[];
  risk?: string;
  rollback?: string;
}

/** Spec：由 Issue 生成的规格说明。 */
export interface Spec extends DomainObjectBase {
  issueId: string;
  status: SpecStatus;
  content: string;
  /** Spec 被某条命令显式 supersede 时的后继 Spec id。 */
  supersededBy?: string;
}

/** Plan：由 Spec 生成的实施计划。 */
export interface Plan extends DomainObjectBase {
  /** 关联 Spec 的 id。 */
  specId: string;
  status: PlanStatus;
  content: string;
  supersededBy?: string;
}

/** Task：Plan 中的具体任务，可声明依赖。 */
export interface Task extends DomainObjectBase {
  /** 关联 Plan 的 id。 */
  planId: string;
  status: TaskStatus;
  title: string;
  description?: string;
  /** 本任务所依赖的其他 Task id 列表。 */
  dependsOn: string[];
  assignee?: string;
}

/** Agent：参与工作流的执行体（人或 AI）。 */
export interface Agent extends DomainObjectBase {
  name: string;
  kind: 'human' | 'ai';
  capabilities?: string[];
}

/** Review：对 spec / plan / task 的评审记录。 */
export interface Review extends DomainObjectBase {
  /** 评审目标类型。 */
  targetType: ReviewTargetType;
  /** 评审目标对象的 id。 */
  targetId: string;
  status: ReviewStatus;
  verdict?: 'approve' | 'request_changes' | 'reject';
  comments?: string;
}

/** Knowledge：沉淀的项目记忆条目。 */
export interface Knowledge extends DomainObjectBase {
  title: string;
  body: string;
  tags?: string[];
  sourceObjectId?: string;
}

import { randomUUID } from 'node:crypto';

/** 生成一个新的对象 id（基于 `crypto.randomUUID()`）。 */
export function newId(): string {
  return randomUUID();
}

/**
 * 构造 provenance 对象。
 * @param sourceCommand 来源命令
 * @param upstreamId 上游对象 id（可选）
 */
export function makeProvenance(sourceCommand: SourceCommand, upstreamId?: string): Provenance {
  return { sourceCommand, ...(upstreamId !== undefined ? { upstreamId } : {}) };
}