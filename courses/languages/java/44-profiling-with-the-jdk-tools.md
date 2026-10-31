---
title: Profiling with the JDK tools
summary: Thread dumps, flight recordings and the order to reach for them when a service is slow.
chapter: The JVM and performance
minutes: 14
status: draft
---

## The tools that ship with the JDK

| Tool | Question it answers |
| --- | --- |
| `jps` | which JVMs are running, and their pids |
| `jstack` | what every thread is doing right now |
| `jcmd` | a long list of commands over the same channels |
| `jstat` | garbage collection and memory statistics over time |
| `jmap` | heap summary and heap dumps |

```bash
jps -l
jcmd <pid> Thread.print > threads.txt
jstat -gcutil <pid> 1000 10
```

`jstat` with an interval prints a line a second, which is how a collection that runs every few seconds under
a light load becomes visible. `jcmd <pid> GC.heap_info` gives the current regions in one line.

## A thread dump is the first thing to take

```text
"http-nio-8080-exec-3" #23 daemon prio=5 os_prio=0 tid=0x00007f... nid=0x3a1c waiting on condition
   java.lang.Thread.State: WAITING (parking)
        at jdk.internal.misc.Unsafe.park(Native Method)
        - parking to wait for  <0x00000000c1a2b3c0> (a java.util.concurrent.SynchronousQueue)
        at com.example.tool.Service.load(Service.java:42)
```

Reading one: find the threads with a state of `RUNNABLE` and a stack that is doing work, and look for a set of
threads all blocked on the same monitor. A pool where every thread sits in the same `WAITING` frame names the
dependency that is not responding, without a profiler attached.

```text
Found one Java-level deadlock:
  "worker-1" waiting to lock monitor 0x... which is held by "worker-2"
```

The JVM detects a deadlock among monitors and prints it at the end of the dump, which turns a hang into a
named pair of frames.

## Flight Recorder is built in

```bash
java -XX:StartFlightRecording=duration=60s,filename=run.jfr -jar tool.jar
jfr print --events jdk.ExecutionSample run.jfr
```

JFR records events the JVM already emits: method samples, allocation samples, garbage collections, lock
acquisitions, file and socket activity, and thrown exceptions. The overhead is low enough to leave it running
in production on a rolling buffer, which is what makes it the tool for a problem that has already happened:

```bash
jcmd <pid> JFR.start duration=300s filename=slow.jfr
jcmd <pid> JFR.dump filename=slow.jfr
```

`jfr print` types the events out, and opening the file in JDK Mission Control gives the same data as charts,
including a flame graph of the sampled stacks.

## A flame graph reads bottom up

A flame graph puts the root at the bottom and each frame's width proportional to the samples under it, so the
widest frame near the top is where the time went. The common misreading is looking at the top of the picture
and treating a tall stack as a problem; the width is what matters, and the interesting question is which
frame could actually be removed.

An allocation flame graph does the same for allocation sites by bytes rather than by samples, which is how a
boxed value in a hot loop shows up as the largest area in the picture.

## Async profiler for CPU outside the JVM

```bash
asprof -d 30 -f profile.html <pid>
```

JFR samples the Java stacks. A native profiler attributes time inside the JVM's own code, in a native library
and in a system call, which is where the answer lives when the time is not in a Java method. The `async-profiler`
tool does both and produces a flame graph that mixes them, which is the version to use when the Java frames do
not explain the time.

## The order to work in

1. **Metrics first.** A rate, a latency histogram and a saturation number say whether anything is wrong and
   which of the three it is.
2. **Thread dump** when the symptom is a hang, a timeout or a backlog. It costs a second and needs no restart.
3. **Flight recording** when the symptom is CPU or memory. It gives samples over time and the allocation
   picture.
4. **Heap dump** when memory grows without returning. It is large and pauses the process while it is written.
5. **JMH benchmark** once the hot method is known and the question is whether a change helps.

Skipping to step five with a guess about which method is slow is the way to spend a day making something
faster that was never the problem.

## Check yourself

Take a thread dump of a running program with a thread pool waiting on a queue and identify the frame each
thread is parked in. Then start a flight recording, run a loop that allocates, and find the allocation site
with the most bytes in `jfr print` output.
