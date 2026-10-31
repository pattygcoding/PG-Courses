---
title: Threads, fibres and processes
summary: What the global lock gives and takes, a race demonstrated, and why Windows has no fork.
chapter: Shipping
minutes: 15
status: draft
---

## A thread is cheap to start

```ruby
thread = Thread.new { sleep 0.1 }
thread.join
thread.value
```

`join` waits for the thread, and `value` waits and returns what the block returned. A thread that raises and that
nobody joins prints a warning and disappears, which is why `thread.abort_on_exception = true` is worth setting in a
script that starts threads and would rather stop than continue with one of them dead.

The question that decides everything about how threads behave is what they are doing.

## Waiting: threads pay

```ruby
puts Benchmark.measure("one sleep  ") { 4.times { sleep 0.1 } }
puts Benchmark.measure("four sleeps") { 4.times.map { Thread.new { sleep 0.1 } }.each(&:join) }
```

```text
  0.000000   0.000000   0.000000 (  0.430444)
  0.000000   0.000000   0.000000 (  0.109230)
```

Four threads slept for a tenth of a second each and the program took 0.11 seconds rather than 0.43. Ruby releases the
interpreter lock while a thread is blocked on I/O, so the waiting overlaps. For a program that reads files or calls an
API, this is the whole payoff, and it is available in the interpreter you already have.

## Computing: threads do not

```text
  0.156000   0.000000   0.156000 (  0.165904)
  0.094000   0.063000   0.157000 (  0.165338)
```

The first line is one thread doing the work four times; the second is four threads doing a quarter each. The wall
clock is the same. The user time dropped and the system time rose, which is the cost of the threads and their
scheduling, and the total CPU used went up rather than down.

That is the global VM lock: one thread runs Ruby bytecode at a time. Threads give concurrency without parallelism, and
for CPU work the only thing they buy is a smaller number of things to manage.

Two ways out. A faster interpreter makes the single thread faster, and a second process makes a second core usable:

```ruby
pid = Process.spawn("ruby", "worker.rb", "part-1")
Process.wait(pid)
```

`Process.spawn` plus `Process.wait` is the plain version of a worker pool. On this machine it is also the only version,
because:

```irb
>> Process.fork
=> NotImplementedError: fork() function is unimplemented on this machine
```

`fork` copies the running process and is what most Ruby parallelism advice assumes. Windows has no `fork`, so a program
that farms work out with it does not run here, and the portable shape is `spawn` with arguments plus a way to collect
results. The Rails course's Puma server shows the same split in its own configuration: three threads by default, and
worker processes where the platform allows them.

## A queue is the safe way to share

```ruby
queue = Queue.new

producer = Thread.new do
  5.times { |i| queue << i * 2 }
  queue.close
end

consumer = Thread.new do
  total = 0
  while (value = queue.pop)
    total += value
  end
  total
end

consumer.value
```

## A race, and the mutex that fixes it

```ruby
unsafe = 0
threads = 8.times.map do
  Thread.new do
    20_000.times do
      value = unsafe
      Thread.pass
      unsafe = value + 1
    end
  end
end
threads.each(&:join)
puts "read, pass, write: #{unsafe} of 160000"
```

```text
read, pass, write: 20007 of 160000
with a mutex:      160000
```

Eight threads did 160,000 increments and the counter reached 20,007. Every lost update is a thread that read the value,
was switched out, and then wrote back a number another thread had already replaced. `Thread.pass` makes the window wide
enough to see, and the window is there without it.

The fix is a mutex around the read and the write:

```ruby
safe = 0
mutex = Mutex.new
threads = 8.times.map do
  Thread.new do
    20_000.times do
      mutex.synchronize do
        value = safe
        Thread.pass
        safe = value + 1
      end
    end
  end
end
threads.each(&:join)
puts "with a mutex:      #{safe}"
```

```text
with a mutex:      160000
```

The same reasoning applies to state in a file. Two people lending a book at the same moment means two writers to one
CSV, so the honest options are a lock file that admits one librarian at a time, or a database with transactions of its
own. The other form of the bug is a shared structure rather than a number: two threads appending to one array can lose
appends in the same way. `Queue` is the structure that does this for you, and `concurrent-ruby` is the gem the wider
ecosystem uses for counters and thread pools. Rails depends on it, which is how most Ruby programs end up with it
installed already.

## Fibres

```ruby
fibre = Fiber.new do |first|
  second = Fiber.yield(first + 1)
  second + 1
end

fibre.resume(1)      # 2
fibre.resume(10)     # 11
```

A fibre is a thread that switches only when it says so. Nothing runs in parallel, nothing is preempted, and a switch
costs a fraction of what a thread's costs. Enumerators are built on them, and so is every async library in Ruby that
works without threads. A script that reads many files is simpler with threads and fast enough; fibres start to matter at
thousands of concurrent operations, which is a server's problem rather than a tool's.

## Ractors, with a warning attached

```irb
>> Ractor.new(3) { |n| (1..n).sum }.take
=> 6
```

```text
concurrency.rb:42: warning: Ractor is experimental, and the behavior may change
in future versions of Ruby! Also there are many implementation issues.
```

A `Ractor` is a thread with its own object space, so nothing is shared and nothing needs a lock. Objects passed between
ractors have to be shareable, which rules out most of what a normal program passes around. It is the answer to the
global lock that does not need processes, and the warning in its own output is the reason not to build on it yet.

## What to do in a tool like this one

| Situation | Answer |
| --- | --- |
| Many files or URLs, each independent | a thread pool with a `Queue` |
| CPU work on one core | nothing; a faster interpreter |
| CPU work on many cores | processes, spawned, or forked where the platform allows |
| Shared mutable state | a mutex, a queue, or a database |
| A scheduled task | a process, not a thread, so it can be watched and killed |
| Thousands of open connections | fibres, through a library that manages them |

For the library tool the answer is none of the above. It reads four books, prints a page and exits. That is a decision
worth recording in a comment, and the wrong thing to fix early.

## Check yourself

Write a script that takes a list of file paths, reads them in four threads, and prints the total number of lines, using
a `Queue` to collect the results. Then write the same script with a `Mutex` around a shared counter instead, and
measure both with `Benchmark.realtime` against a single-threaded version over a hundred files.

The framework most Ruby is written in, and the one that makes these questions concrete, is Rails. It has its own course
in this catalogue and it starts where this one leaves off.

```text
queue total: 20, producer status: false
```

`Queue` is thread-safe, `pop` blocks until something arrives, and closing the queue makes `pop` return nil so the
consumer can finish. A producer and a consumer joined by a queue need no locks at all, and that is the shape to reach
for before reaching for a mutex.
