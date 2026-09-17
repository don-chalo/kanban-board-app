import * as Avatar from '@radix-ui/react-avatar'
import * as Select from '@radix-ui/react-select'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { LifecycleState, StoryPoints, Task, TaskPriority, UserId } from '../lib/api'
import { emailInitial, STATE_LABELS } from '../lib/states'

const PRIORITY_INITIAL: Record<TaskPriority, string> = {
  low: 'L',
  medium: 'M',
  high: 'H',
  urgent: 'U',
}

interface TaskCardProps {
  task: Task
  members: Map<UserId, string>
  moves: LifecycleState[]
  movesFailed?: boolean
  onMoved: (taskId: string, target: LifecycleState) => void
  editable?: boolean
  onEdit?: (task: Task) => void
}

function TaskCard({
  task,
  members,
  moves,
  movesFailed = false,
  onMoved,
  editable = false,
  onEdit,
}: TaskCardProps) {
  const email = members.get(task.owner) ?? task.owner
  const editActive = editable && onEdit !== undefined
  const priority: TaskPriority = task.priority ?? 'medium'
  const startedAt: string | null = task.startedAt ?? null
  const storyPoints: StoryPoints | null = task.storyPoints ?? null

  return (
    <li className="group relative border border-xenon/60 bg-transparent px-3 pb-8 pt-2 pr-8 hover:border-xenon hover:bg-xenon/10">
      <Tooltip.Root delayDuration={0}>
        <Tooltip.Trigger asChild>
          {editActive ? (
            <button
              type="button"
              aria-label={`Edit task ${task.title}`}
              onClick={() => onEdit(task)}
              className="w-full truncate text-left font-bold tracking-wide hover:underline"
            >
              {task.title.toUpperCase()}
            </button>
          ) : (
            <p className="truncate font-bold tracking-wide">{task.title.toUpperCase()}</p>
          )}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            className="border border-xenon bg-void px-2 py-1 text-xs tracking-widest text-xenon"
          >
            <p className="font-bold tracking-wide">{task.title.toUpperCase()}</p>
            <p className="text-sm">{task.description}</p>
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <p className="mt-1 text-xs tracking-widest opacity-70">{STATE_LABELS[task.state]}</p>
      {storyPoints !== null && (
        <span
          data-testid="task-story-points"
          title={`${storyPoints} story points`}
          aria-label={`${storyPoints} story points`}
          className="absolute right-1 top-1 flex h-5 min-w-6 items-center justify-center border border-xenon/60 px-1 font-matrix text-[12px] font-bold tracking-widest text-xenon"
        >
          {storyPoints}
        </span>
      )}
      <Tooltip.Root delayDuration={0}>
        <Tooltip.Trigger asChild>
          <span
            data-testid="task-priority-badge"
            title={priority}
            aria-label={`Priority ${priority}`}
            className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center border border-xenon/60 font-matrix text-[12px] font-normal tracking-widest text-xenon"
          >
            {PRIORITY_INITIAL[priority]}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side='right' className="border border-xenon bg-void px-2 py-1 text-xs tracking-widest text-xenon">
            <p className="font-bold tracking-wide">Priority: {priority}</p>
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      <Tooltip.Root delayDuration={0}>
        <Tooltip.Trigger asChild>
          <Avatar.Root
            data-testid="task-owner-avatar"
            className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border border-xenon bg-xenon font-matrix text-[10px] font-bold text-void"
          >
            <Avatar.Fallback>{emailInitial(email)}</Avatar.Fallback>
          </Avatar.Root>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            className="border border-xenon bg-void px-2 py-1 text-xs tracking-widest text-xenon"
          >
            {email}
            <Tooltip.Arrow className="fill-xenon" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      {startedAt !== null && (
        <span
          data-testid="task-started-at"
          title={startedAt}
          aria-label={`Started ${startedAt}`}
          className="absolute bottom-1 right-9 text-[12px] tracking-widest opacity-70"
        >
          {startedAt.slice(0, 10)}
        </span>
      )}

      {(movesFailed || moves.length > 0) && (
        <Select.Root
          disabled={movesFailed || moves.length === 0}
          onValueChange={(target) => onMoved(task.id, target as LifecycleState)}
        >
        <Select.Trigger
          aria-label={`Move task ${task.title}`}
          className="absolute right-1 top-1/2 -translate-y-1/2 border border-xenon/60 bg-void px-1.5 py-0.5 text-xenon opacity-0 outline-none transition-opacity focus:ring-2 focus:ring-xenon group-hover:opacity-100 data-[state=open]:opacity-100 aria-disabled:cursor-not-allowed"
        >
          <Select.Value placeholder=">" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            className="min-w-40 border border-xenon bg-void p-1 text-xenon"
          >
            <Select.Viewport>
              {moves.map((state) => (
                <Select.Item
                  key={state}
                  value={state}
                  className="cursor-pointer px-2 py-1 text-sm tracking-widest outline-none data-highlighted:bg-xenon data-highlighted:text-void"
                >
                  <Select.ItemText>{STATE_LABELS[state]}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
        </Select.Root>
      )}
    </li>
  )
}

export default TaskCard