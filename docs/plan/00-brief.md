# The user's brief (verbatim intent, lightly cleaned)

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
