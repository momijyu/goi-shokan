# Third-Party Notices & Licenses

Full Apache License 2.0 text: `public/APACHE-2.0.txt` (`/APACHE-2.0.txt`)

---

## 1. kuromoji.js & mecab-ipadic-2.7.0-20070801
- Browser script: `public/vendor/kuromoji.js` (prepended with attribution banner)
- Binary dictionary: `public/dict/*.dat.gz`
- Copyright 2014 Takuya Asano (`https://github.com/takuyaa/kuromoji.js`)
- `kuromoji.js` is licensed under the Apache License, Version 2.0 (`/APACHE-2.0.txt`).
- Modification notice (Apache-2.0 Section 4(b)): `public/vendor/kuromoji.js` was modified in `BrowserDictionaryLoader.prototype.loadArrayBuffer` to preserve `https://` when loading dictionary files from external object storage URLs.
- `public/vendor/kuromoji.js` bundles `async` (v2.6.4, MIT License, Caolan McMahon), `doublearray` (v0.0.2, MIT License, takuyaa), and `zlibjs` (v0.3.1, MIT License, Yuta Imaya).
- Includes binary/source data from `mecab-ipadic-2.7.0-20070801`, covered by the following notice (`node_modules/kuromoji/NOTICE.md`):

```text
Copyright 2000, 2001, 2002, 2003 Nara Institute of Science
and Technology.  All Rights Reserved.

Use, reproduction, and distribution of this software is permitted.
Any copy of this software, whether in its original form or modified,
must include both the above copyright notice and the following
paragraphs.

Nara Institute of Science and Technology (NAIST),
the copyright holders, disclaims all warranties with regard to this
software, including all implied warranties of merchantability and
fitness, in no event shall NAIST be liable for
any special, indirect or consequential damages or any damages
whatsoever resulting from loss of use, data or profits, whether in an
action of contract, negligence or other tortuous action, arising out
of or in connection with the use or performance of this software.

A large portion of the dictionary entries
originate from ICOT Free Software.  The following conditions for ICOT
Free Software applies to the current dictionary as well.

Each User may also freely distribute the Program, whether in its
original form or modified, to any third party or parties, PROVIDED
that the provisions of Section 3 ("NO WARRANTY") will ALWAYS appear
on, or be attached to, the Program, which is distributed substantially
in the same form as set out herein and that such intended
distribution, if actually made, will neither violate or otherwise
contravene any of the laws and regulations of the countries having
jurisdiction over the User or the intended distribution itself.

NO WARRANTY

The program was produced on an experimental basis in the course of the
research and development conducted during the project and is provided
to users as so produced on an experimental basis.  Accordingly, the
program is provided without any warranty whatsoever, whether express,
implied, statutory or otherwise.  The term "warranty" used herein
includes, but is not limited to, any warranty of the quality,
performance, merchantability and fitness for a particular purpose of
the program and the nonexistence of any infringement or violation of
any right of any third party.

Each user of the program will agree and understand, and be deemed to
have agreed and understood, that there is no warranty whatsoever for
the program and, accordingly, the entire risk arising from or
otherwise connected with the program is assumed by the user.

Therefore, neither ICOT, the copyright holder, or any other
organization that participated in or was otherwise related to the
development of the program and their respective officials, directors,
officers and other employees shall be held liable for any and all
damages, including, without limitation, general, special, incidental
and consequential damages, arising out of or otherwise in connection
with the use or inability to use the program or any product, material
or result produced or otherwise obtained by using the program,
regardless of whether they have been advised of, or otherwise had
knowledge of, the possibility of such damages at any time during the
project or thereafter.  Each user will be deemed to have agreed to the
foregoing by his or her commencement of use of the program.  The term
"use" as used herein includes, but is not limited to, the use,
modification, copying and distribution of the program and the
production of secondary products from the program.

In the case where the program, whether in its original form or
modified, was distributed or delivered to or received by a user from
any person, organization or entity other than ICOT, unless it makes or
grants independently of ICOT any specific warranty to the user in
writing, such person, organization or entity, will also be exempted
from and not be held liable to the user for any such damages as noted
above as far as the program is concerned.
```

---

## 2. SudachiDict (v20261015)
- Compact lexicon derived from `small_lex.csv` and `core_lex.csv`: `public/dict/sudachi_lex.tsv.gz`
- Repository: https://github.com/WorksApplications/SudachiDict
- Licensed under the Apache License, Version 2.0 (`/APACHE-2.0.txt`).
- Modification notice (Apache-2.0 Section 4(b)): `public/dict/sudachi_lex.tsv.gz` is a modified subset file created for this application by extracting surface forms, POS tags, lexicon tier, and readings from SudachiDict `small_lex.csv` and `core_lex.csv`. The compressed file retains an inline `#` modification notice header.
- Upstream `LEGAL` notice:

```text
LEGAL NOTICE INFORMATION
========================

- All the files in this distribution are covered under the Apache License
version 2.0. (see the file LICENSE-2.0.txt)


- src/main/text/small_lex.csv contains a part
  of UniDic (https://unidic.ninjal.ac.jp/).
- src/main/text/matrix.def.zip is a part of UniDic.

Copyright (c) 2011-2013, The UniDic Consortium
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

 * Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.

 * Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the
   distribution.

 * Neither the name of the UniDic Consortium nor the names of its
   contributors may be used to endorse or promote products derived
   from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


- src/main/text/core_lex.csv and src/main/text/notcore_lex.csv contain
a part of NEologd (https://github.com/neologd/mecab-unidic-neologd).

Copyright (C) 2015-2019 Toshinori Sato (@overlast)

      https://github.com/neologd/mecab-unidic-neologd

    i. 本データは、株式会社はてなが提供するはてなキーワード一覧ファイル
       中の表記、及び、読み仮名の大半を使用している。

       はてなキーワード一覧ファイルの著作権は、株式会社はてなにある。

       はてなキーワード一覧ファイルの使用条件に基づき、また、
       データ使用の許可を頂いたことに対する感謝の意を込めて、
       以下に株式会社はてなおよびはてなキーワードへの参照をURLで示す。

       株式会社はてな : http://hatenacorp.jp/information/outline

       はてなキーワード :
       http://developer.hatena.ne.jp/ja/documents/keyword/misc/catalog

   ii. 本データは、日本郵便株式会社が提供する郵便番号データ中の表記、
       及び、読み仮名を使用している。

       日本郵便株式会社は、郵便番号データに限っては著作権を主張しないと
       述べている。

       日本郵便株式会社の郵便番号データに対する感謝の意を込めて、
       以下に日本郵便株式会社および郵便番号データへの参照をURLで示す。

       日本郵便株式会社 :
         http://www.post.japanpost.jp/about/profile.html

       郵便番号データ :
         http://www.post.japanpost.jp/zipcode/dl/readme.html

  iii. 本データは、スナフキん氏が提供する日本全国駅名一覧中の表記、及び
       読み仮名を使用している。

       日本全国駅名一覧の著作権は、スナフキん氏にある。

       スナフキん氏は 「このデータを利用されるのは自由ですが、その際に
       不利益を被ったりした場合でも、スナフキんは一切責任は負えません
       ことをご承知おき下さい」と述べている。

       スナフキん氏に対する感謝の意を込めて、
       以下に日本全国駅名一覧のコーナーへの参照をURLで示す。

       日本全国駅名一覧のコーナー :
         http://www5a.biglobe.ne.jp/~harako/data/station.htm

   iv. 本データは、工藤拓氏が提供する人名(姓/名)エントリデータ中の、
       漢字表記の姓・名とそれに対応する読み仮名を使用している。

       人名(姓/名)エントリデータは被災者・安否不明者の人名の
       表記揺れ対策として、Mozcの人名辞書を活用できるという
       工藤氏の考えによって提供されている。

       工藤氏に対する感謝の意を込めて、
       以下にデータ本体と経緯が分かる情報への参照をURLで示す。

       人名(姓/名)エントリデータ :
         http://chasen.org/~taku/software/misc/personal_name.zip

       上記データが提供されることになった経緯
         http://togetter.com/li/111529

    v. 本データは、Web上からクロールした大量の文書データから抽出した
       表記とそれに対応する読み仮名のデータを含んでいる。

       抽出した表記とそれに対応する読み仮名の組は、上記の i. から iv.
       の言語資源の組み合わせによって得られる組のみを採録した。

       Web 上に文書データを公開して下さっている皆様に感謝いたします。

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## 3. Japanese WordNet (v2.1)
- Compact definitions derived from `wnja-2.1.xml`: `public/dict/wnja_defs.tsv.gz`
- Repository: https://github.com/bond-lab/wnja
- Modification notice: `public/dict/wnja_defs.tsv.gz` is a modified subset file created for this application by extracting lemma-to-definition pairs (`word<TAB>def...`) from `wnja-2.1.xml`. The compressed file retains an inline `#` copyright notice and disclaimer header below.

```text
Copyright: 2021-2026 Francis Bond, Takayuki Kuribayashi
Copyright: 2018-2020 Francis Bond
Copyright: 2016-2017 Francis Bond, Takayuki Kuribayashi
Copyright: 2012-2015 Francis Bond
Copyright: 2009-2011 NICT

Japanese WordNet

This software and database is being provided to you, the LICENSEE, by
the National Institute of Information and Communications Technology
under the following license. By obtaining, using and/or copying this
software and database, you agree that you have read, understood, and
will comply with these terms and conditions:

Permission to use, copy, modify and distribute this software and
database and its documentation for any purpose and without fee or
royalty is hereby granted, provided that you agree to comply with
the following copyright notice and statements, including the
disclaimer, and that the same appear on ALL copies of the software,
database and documentation, including modifications that you make
for internal use or for distribution.

THIS SOFTWARE IS PROVIDED "AS IS" AND NICT MAKES NO
REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED. BY WAY OF EXAMPLE,
BUT NOT LIMITATION, NICT MAKES NO REPRESENTATIONS OR WARRANTIES OF
MERCHANTABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE
OF THE LICENSED SOFTWARE, DATABASE OR DOCUMENTATION WILL NOT INFRINGE
ANY THIRD PARTY PATENTS, COPYRIGHTS, TRADEMARKS OR OTHER RIGHTS.

The name of the National Institute of Information and Communications
Technology may not be used in advertising or publicity pertaining to
distribution of the software and/or database. Title to copyright in
this software, database and any associated documentation shall at all
times remain with National Institute of Information and Communications
Technology and LICENSEE agrees to preserve same.
```

---

## 4. Kyoiku Kanji & Joyo Kanji Lists (CC0 1.0 Universal / Public Domain)
- Used to build `src/data/kanjiLevels.ts` (1,026 Kyoiku Kanji + 2,136 Joyo Kanji).
- Source repository: https://github.com/mimneko/kanji-data (CC0 1.0 Universal), based on official Japan MEXT / Bunkacho lists.

---

## 5. Bundled Runtime Libraries & Web Fonts
This application also bundles open-source packages and fonts under their respective licenses:
- `next` (v16.4.6) — MIT License
- `react` & `react-dom` (v19.3.0) — MIT License
- `@base-ui/react` (v1.9.0) — MIT License (MUI Team)
- `framer-motion` (v14.14.0) — MIT License (Matt Perry)
- `lucide-react` (v1.73.0) — ISC License (Eric Fennis)
- `class-variance-authority` (v0.7.1) — Apache License 2.0 (Joe Bell, `/APACHE-2.0.txt`)
- `clsx` (v2.1.1) — MIT License (Luke Edwards)
- `tailwind-merge` (v3.7.0) — MIT License (Dany Castillo)
- `tailwindcss` (v4.3.3) — MIT License
- `tw-animate-css` (v1.4.0) — MIT License (Luca Bosin)
- Google Fonts (`Shippori Mincho`, `Noto Sans JP`, `JetBrains Mono`, `DotGothic16`) — SIL Open Font License, Version 1.1
- Outbound word lookup links open `ja.wiktionary.org` in a separate browser tab; no Wiktionary content is bundled or redistributed.
