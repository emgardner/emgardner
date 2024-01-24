---
title: Web Scraping and Crawling in Rust
description: Pleasant Surprises using rust for web scraping
tags:
  - rust
  - "#web-scraping"
date: 01-22-2024
draft: false
---
I'm working on trying to surface some new blog's to read. Some of the places I first thought to look work [Hackernews](https://news.ycombinator.com/) and  [Lobste.rs](https://lobste.rs/) I came across a pretty good [post](https://news.ycombinator.com/item?id=28632002) that pointed out a few other link aggregators as well listed below. 

- https://blogboard.io/
  - Engineering blogs by top tech companies All in one place
- https://embit.ca/
  - Signals from Technosphere
- https://www.metafilter.com/
  - Community weblog's
- https://engineeringblogs.xyz/
  - RSS Feed of 510 different engineering blog's mostly large companies
- https://news.slashdot.org/
  - Not really sure about this one
- https://boingboing.net/
  - Way too political
- https://lemmy.ml/
  - Open-Source reddit alternative couldn't find much of interest
- https://unfeeder.com/
  - Basically a bare bones RSS feed. I like the simplicity but didn't see anything cool
- https://www.fark.com/
  - Another big news aggregator nothing great
- https://upstract.com/
  - Another big news aggregator nothing great
- https://devurls.com/ , https://techurls.com/ , https://sciurls.com/ , https://hwurls.com/
  - A bunch of browserling site's nothing amazing that i was too interested in
- https://www.aldaily.com/
  - Lot's of articles but again basically just big news 
- https://freepo.st/
  - Just another link aggregator

So after looking through those option's I thought the best options were still hackernews and lobste.rs. Both have a fairly straightforward content structure. My go to for something like this is to just use **python** and **BeautifulSoup** but I've been wanting to scratch my rust itch again so I went with rust, and honestly it wasn't nearly as cumbersome as I had initially thought. You really don't need to much to get started

```bash
cargo add reqwest --features json
cargo add scraper 
cargo add tokio --features full 
```

You could just just the blocking version of reqwest here but I had some stuff i wanted to use tokio for later on so mine as well.

Just like any normal project we start by defining what data we want to pull out (yes i know there is an api but i wanted to retrieve just stories going back quite sometime).

```rust
use reqwest;
use scraper::{ElementRef, Html, Selector};

#[derive(Debug)]
pub enum RowType {
    Thing(Thing),
    Info(Info),
    Spacer,
    More,
}

#[derive(Debug)]
pub struct Thing {
    id: String,
    rank: String,
    titleline: String,
    link: String,
}

#[derive(Debug)]
pub struct Info {
    score: String,
    user: String,
    date: String,
    comments: String,
}

#[derive(Debug)]
pub struct Post {
    id: String,
    rank: String,
    // rank: i32,
    titleline: String,
    link: String,
    // score: i32,
    score: String,
    user: String,
    date: String,
    // comments: i32
    comments: String,
}
```

![HackerNews Posts](/assets/obsidian//hackernews-posts.png)

The post structure is probably fairly obvious this was a quick and dirty thing so i didn't even bother parsing the rank, score, comments at first.  The other's may not be though. The body of the hackernews post's are just table row's and each of those row's have different information. So i decided to make an incremental parser to combine the information. The DOM structure is as follows:

```html
<tr class="athing" id="39110434">
    <td align="right" valign="top" class="title">
        <span class="rank">1.</span>
    </td>
    <td valign="top" class="votelinks">
        <center>
            <a id="up_39110434" href="vote?id=39110434&amp;how=up&amp;goto=news">
                <div class="votearrow" title="upvote">
                </div>
            </a>
        </center>
    </td>
    <td class="title">
        <span class="titleline">
            <a href="https://waterwaymap.org">Waterway Map</a>
            <span class="sitebit comhead">
                (<a href="from?site=waterwaymap.org">
                    <span class="sitestr">waterwaymap.org</span>
                </a>)
            </span>
        </span>
    </td>
</tr>
<tr>
    <td colspan="2"></td>
    <td class="subtext">
        <span class="subline">
            <span class="score" id="score_39110434">92 points</span> by
            <a href="user?id=wcedmisten" class="hnuser">wcedmisten</a>
            <span class="age" title="2024-01-23T21:51:06">
                <a href="item?id=39110434">2 hours ago</a>
            </span>
            <span id="unv_39110434"></span> |
            <a href="hide?id=39110434&amp;goto=news">hide</a> |
            <a href="item?id=39110434">19&nbsp;comments</a>
        </span>
    </td>
</tr>
<tr class="spacer" style="height:5px"></tr>
```

So we've got a fairly straight forward approach here. Iterate through the table if it's a spacer toss it. If it's a **athing** we parse an additional row as an info row and combine them.

```rust
fn parse_thing(row: &ElementRef<'_>) -> Option<Thing> {
    let link_selector = Selector::parse("td > span > a").unwrap();
    let rank_selector = Selector::parse("span.rank").unwrap();
    let id = row.value().attr("id")?;
    let link_ele = row.select(&link_selector).next()?;
    let rank_ele = row.select(&rank_selector).next()?;
    let link = link_ele.value().attr("href")?;
    Some(Thing {
        id: id.to_string(),
        rank: rank_ele.inner_html(),
        titleline: link_ele.inner_html(),
        link: link.to_string(),
    })
}

fn parse_row(subline: &ElementRef<'_>) -> Option<Info> {
    let score_selector = Selector::parse("span.score").unwrap();
    let user_selector = Selector::parse(".hnuser").unwrap();
    let date_selector = Selector::parse("span.age").unwrap();
    let comment_selector = Selector::parse("a").unwrap();
    let score = subline.select(&score_selector).next()?;
    let user = subline.select(&user_selector).next()?;
    let date = subline
        .select(&date_selector)
        .next()?
        .value()
        .attr("title")?;
    let comment = subline
        .select(&comment_selector)
        .filter(|e| e.inner_html().contains("comments"))
        .nth(0)?;
    return Some(Info {
        score: score.inner_html().to_string(),
        user: user.inner_html().to_string(),
        date: date.to_string(),
        comments: comment.inner_html(),
    });
}

fn process_row(row: &ElementRef) -> Option<RowType> {
    let class = row.value().attr("class").unwrap_or("");
    let subline_selector = Selector::parse("span.subline").unwrap();
    match class {
        "spacer" => return Some(RowType::Spacer),
        "athing" => match parse_thing(row) {
            Some(thing) => Some(RowType::Thing(thing)),
            None => None,
        },
        _ => {
            let subline = row.select(&subline_selector).next();
            match subline {
                Some(s) => match parse_row(&s) {
                    Some(info) => Some(RowType::Info(info)),
                    None => None,
                },
                _ => None,
            }
        }
    }
}
```

Ok easy enough not too pretty but it works let's move onto actually getting the rows from the page though

```rust
fn get_posts(document: &str) -> Option<Vec<Post>> {
    let document = Html::parse_document(document);
    let main_table_selector =
        Selector::parse("#hnmain > tbody > tr:nth-child(3) > td > table").unwrap();
    let tr_selector = Selector::parse("tr").unwrap();
    let main_table = document.select(&main_table_selector).next()?;
    let mut posts: Vec<Post> = vec![];
    let mut table_rows = main_table.select(&tr_selector);
    while let Some(row) = table_rows.next() {
        if let Some(row_type) = process_row(&row) {
            match row_type {
                RowType::Thing(thing) => {
                    if let Some(nextrow) = table_rows.next() {
                        if let Some(inforow) = process_row(&nextrow) {
                            match inforow {
                                RowType::Info(info) => {
                                    posts.push(Post {
                                        id: thing.id,
                                        rank: thing.rank,
                                        titleline: thing.titleline,
                                        link: thing.link,
                                        score: info.score,
                                        user: info.user,
                                        date: info.date,
                                        comments: info.comments,
                                    });
                                }
                                _ => (),
                            }
                        }
                    }
                }
                _ => (),
            }
        }
    }
    Some(posts)
}
```

**The css selector utility on chrome dev tools is your friend here use it**

Alright and with that we've got one last remaining order of business actually getting the web page

```rust
#[derive(Debug)]
pub struct PageParams {
    day: String,
    page: u32,
}

fn format_request(params: &PageParams) -> String {
    format!(
        "https://news.ycombinator.com/front?day={}&p={}",
        params.day, params.page
    )
}

pub async fn get_page(params: &PageParams) -> reqwest::Result<String> {
    let client = reqwest::Client::new();
    // reqwest::get(format_request(params))
    println!("{:?}", format_request(params));
    client
        .get(format_request(params))
        .header(USER_AGENT, "rust crawler demo")
        .send()
        .await?
        .text()
        .await
}
```

Nothing fancy just a simple get request to the page of our choosing by date and page number. 

Ohhhhh and last but not least **don't run this** I got my IP blacklisted iterating through every page on a given date with a 1 second delay. It didn't take long either so I woudn't recommend doing it on anything but the front page. 

Luckily i was able to run through every post on lobste.rs without any issue but i'll leave figuring out how to do that to you. Hopefully more info on that later once i process the dataset a little better.

