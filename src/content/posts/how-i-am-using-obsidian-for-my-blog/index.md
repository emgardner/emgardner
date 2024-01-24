---
draft: false
tags:
  - PROGRAMMING
  - "#obsidian"
title: How i am using Obsidian for my blog
date: 01-12-2024
---
I've been wanting to write more blog articles mostly for three reasons:

- I believe writing will help clarify my thought's and cement my knowledge.
- I've only ever really taken information from the internet and barely contributed to the vast body of knowledge on it. As someone who's mostly self taught I have a sense of indebtedness to the author's of internet content and hope I can produce something that may benefit other's.
- It's a reasonable way for me to document some of the projects and thing's i'm working on.

In the past, I experimented with blogging, but it often felt like a cumbersome endeavor. Admittedly, I didn't put in a great deal of effort to streamline the process. My aim was to find a solution that was straightforward and offered me complete control. This led me to choose [AstroJS](https://astro.build/) along with Markdown. Using a CMS like WordPress or Ghost seemed overly complex for my needs, though this perception might not be entirely accurate.

My initial goal was to edit blog posts directly in my text editor and have the flexibility to organize my files effortlessly. However, this approach had its challenges. I quickly discovered that managing images and creating links to other pages was more frustrating than I anticipated. Additionally, integrating my preferred folder structure into Astro proved to be surprisingly tricky.

By this point I've been using Obsidian for the better part of a year now and I really like it. I'm not a power user by any stretch, and my note taking habit's could be way better. So i thought why not just use the markdown editor that Obsidian provides me with to edit my blog content?

![Pasted image 20240107154046](/assets/obsidian//pasted-image-20240107154046.png)
<p style="text-align: center; font-style:italic;">Obligatory Obsidian Graph</p>


Plus how hard could it be for me to write a pre-processing pipeline for the files. No way it takes me more than an hour to get everything tied up nicely? Well i wasn't too far off it probably ended up being about an hour and a half to get things just the way i like it, and to be fair to myself this is largely because I had no idea how to use the parser I picked: [marko](https://github.com/frostming/marko/)

All I really needed to do was add a few custom elements to the parser and renderer and figure out a way to pass file information into my renderer. This is still very  much a **WIP** but the majority of it can be seen here:

```python
import marko
import marko.md_renderer
from marko.parser import Parser
from marko.block import BlockElement
from marko.inline import InlineElement
from marko.helpers import MarkoExtension
import re
from helpers import slugify_filename
import os
import shutil


class ObsidianWiki(InlineElement):
    """WikiLink: [[FileName]]"""
    pattern = r"\[\[ *(.+?) *\]\]"
    parse_children = True

    def __init__(self, match):
        self.target = match.group(1)

class ObsidianImage(InlineElement):
    """WikiLink: ![[FileName]]"""
    pattern = r"\!\[\[ *(.+?) *\]\]"
    parse_children = True

    def __init__(self, match):
        self.target = match.group(1)

class FrontMatter(BlockElement):
    priority = 100  # High priority to parse it before other elements
    pattern = re.compile(r"( {,3})(-{3,}|~{3,})[^\n\S]*(.*?)$", re.DOTALL)
    parse_children = False

    def __init__(self, match):
        self.content = match

    @classmethod
    def match(cls, source):
        m = source.expect_re(cls.pattern)
        if not m:
            return None
        prefix, leading, info = m.groups()
        if leading[0] == "`" and "`" in info:
            return None
        return m

    @classmethod
    def parse(cls, source):
        source.next_line()
        source.consume()
        lines = []
        while not source.exhausted:
            line = source.next_line()
            if line is None:
                break
            source.consume()
            m = re.match(r"( {,3})(-{3,}|~{3,})[^\n\S]*(.*?)$", line, re.DOTALL)
            if m:
                break
            lines.append(line)
        return "".join(lines)

class ObsidianExtension(MarkoExtension):
    elements = [FrontMatter, ObsidianWiki, ObsidianImage]

    def extend(self, parser):
        parser.inline_parsers.insert(0, FrontMatterParser())
        parser.inline_parsers.insert(1, ObsidianImageParser())
        parser.inline_parsers.insert(2, ObsidianWikiParser())

def create_extension(settings, source_path, target_path):
    return MarkoExtension(
        elements=[FrontMatter, ObsidianWiki, ObsidianImage],
    )

class ObsidianRenderer(marko.md_renderer.MarkdownRenderer):
    file_data = {}

    def __init__(self):
        super().__init__()

    def render_obsidian_wiki(self, element):
        settings = self.file_data.get("settings")
        target_path = self.file_data.get("target_path")
        fp = os.path.split(target_path)
        return "[{}]({})".format(
            element.target, settings.linkBase + slugify_filename(element.target)
        )

    def render_obsidian_image(self, element):
        settings = self.file_data.get("settings")
        target_path = self.file_data.get("target_path")
        fp = os.path.split(target_path)
        shutil.copy(
            os.path.expanduser(
                os.path.expandvars(
                    settings.vaultRoot + settings.imageDirectory + element.target
                )
            ),
            slugify_filename(
                os.path.expanduser(
                    os.path.expandvars(settings.assetOutput + element.target)
                )
            ),
        )
        return "![{}]({})".format(
            element.target.split(".")[0],
            slugify_filename(settings.assetBase + element.target),
        )

    def render_front_matter(self, element):
        return "---\n{}---\n".format(element.content)

```

There's a couple of obsidian specific extensions i'm missing but I've yet to use them, so when the time comes I will add them in. I think this can serve as a nice starting place for my blog now the real hard part start's. Actually maintaining a writing habit. If you're interested in the rest of the codebase you can check out the [repo](https://github.com/emgardner/obsidian-parser).

