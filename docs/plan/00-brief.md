# The user's brief (verbatim intent, lightly cleaned)

## Original ask (2026-09-18)

"I want to create a system that allows for procedurally generated UI through some sort of
style sheet that basically gives the AI the building blocks to build UI around whatever
application it is operating for. For example if I asked Claude to show me America it might
create a little globe or circle that I can scroll on to visualize it. I saw a while ago
someone made an AI that works on a similar principle - the whole screen was a chatbox but
it created AI-generated UI for all the responses: the globe thing, or it might spawn an
interactive spreadsheet when asked to sort through some data, or interactive diagrams.
Many AIs can already do all this, but this repo is supposed to be a sort of design sheet /
guide / building blocks to make it all easy and cheap and consistent and themed."

Additional constraints the user stated:
- Use free assets from online where possible, or better yet make them ourselves.
- This repo should be THE BONES - the system, everything that makes it work.
- It should ALSO have a renderer, but the two must be CLEARLY SEPARATE.
- "This is a prototype so I need to be able to throw away the top half and fix the innards
  later, or reuse the important bits that make it unique."
- Still wants the full demo/pack.
- Plan thoroughly: how it works, where to get the parts.
- Implementation broken into broad steps (each step will later get its own critique loop).

## CLARIFICATION (2026-09-19) - the part that was cut off before the critique loop

Verbatim: "the goal is for procedurally or automatically generated **persistent** ui. for
instance i have a space where as i write more more things pop up and persist. the space
should be able to reach u or some other api/ai agent like you. so i write and as necessary
or interchangeably persistent or temporary ui elements and artifacts that just persist so
long as the server the data is stored in exists. and what we're building is the thing that
allows that to happen consistently and with good quality and on theme, well structured
elements using online free sprites, ui elements, pixel art, painting software, mesh/model
software etc etc to comfortably and easily allow a sufficiently sophisticated model to
create a sort of **sandbox space**."

### What this changes, stated plainly

This is not a chat transcript with widgets in it. Six things follow, and they are binding:

1. **A SPACE, not a transcript.** Things "pop up and persist" into a durable surface that
   accumulates. The chat log is an input channel, not the container.
2. **PERSISTENCE IS THE PRODUCT**, not a justification for a design choice. Lifetime is
   server-bounded: artifacts live as long as the server holding the data does.
3. **TWO EXPLICIT LIFETIMES.** "Persistent or temporary, interchangeably" - lifetime is a
   first-class, author-controllable property of every element, not an implicit consequence.
4. **THE SPACE CALLS OUT.** "The space should be able to reach u or some other api/ai
   agent" - elements in the space can invoke an agent. This is bidirectional: the agent
   builds the space, and the space can call the agent. That is an inversion v1-v4 never
   considered; all four assumed a one-way model-emits-UI pipeline.
5. **ASSETS ARE FIRST-CLASS AND BROAD.** Free sprites, UI elements, pixel art, painting
   software, mesh/model software. Not charts-and-tables. The "no icon/illustration asset
   story" gap (round 4, J17) is not a gap - it is half the brief.
6. **THE USER IS A SUFFICIENTLY SOPHISTICATED MODEL.** The thing being optimised is an
   agent's ability to comfortably and easily build in this space. Ergonomics for a model
   is the design target.

### Consequence for the plan

Round 4's biggest unresolved finding (L1/L2: "framework or application? - PICK ONE") is
answered: **it is a substrate.** A persistent, agent-addressable space. The World Bank
statistics browser was never the product; it was one demo standing in for the product, and
it consumed ~40% of v4.
