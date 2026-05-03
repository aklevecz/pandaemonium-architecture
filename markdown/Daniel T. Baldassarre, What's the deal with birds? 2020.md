# What’s the Deal with Birds?

**Daniel T. Baldassarre***
*Department of Biological Sciences, SUNY Oswego, USA*

* **Corresponding author:** Daniel T. Baldassarre, Department of Biological Sciences, SUNY Oswego, Oswego, NY 13126, USA.
* **Received Date:** March 25, 2020
* **Published Date:** April 01, 2020

### Abstract
Many people wonder: what’s the deal with birds? This is a common query. Birds are pretty weird. I mean, they have feathers. WTF? Most other animals don’t have feathers. To investigate this issue, I looked at some birds. I looked at a woodpecker, a parrot, and a penguin. They were all pretty weird! In conclusion, we may never know the deal with birds, but further study is warranted.

**Keywords:** birds, ornithology, behavior, phenotype, WTF, genomics, climate change

## Introduction

Birds are very strange. Some people are like “whoa they’re flying around and stuff, what’s the deal with that?” This sentiment is shared by people across socioeconomic backgrounds. Figuring out what the deal is with birds is of the utmost scientific importance. It is now widely appreciated that the majority of socially monogamous passerine species are weird [1]. In species with moderately high extra-pair mating and paternal care, we need to understand what is going on with them [2]. In territorial species, what are they even doing [3] and they do all sorts of weird stuff [4] (but see [5]). In addition, there is a rich body of literature on how birds – which are very strange feathered creatures [6] – can strengthen the pair bond and signal commitment, or directly guard against extra-pair copulations (EPCs) [7-9]. Despite these insights, the relative weirdness of birds as opposed to other animals is yet untested.

I set out to test these hypotheses by observing several bird species. Multiple species endemic to Australia with moderately high rates of extra-pair paternity (EPP, 56% of young in this population [10]). Males regularly foray onto neighboring territories to pursue and display to potential extra-pair females [11,12]. Thus, territorial males often encounter intruding rivals that elicit a multimodal behavioral response including physical aggression and song. I watched birds and tried to figure out what they were up to. I predicted that these birds would be pretty wild, but that I might be able to figure out what their deal is.

## Material and Methods

### Study species and general field methods

I looked at three different birds: a woodpecker, a parrot, and a penguin. I looked really close at them, squinting and everything, to try and figure out what was up with them. I conducted these experiments at our long-term study site in Samsonvale, Queensland (GPS = 27°16’S, 152°51’E). Detailed population monitoring and paternity assignment methods are described elsewhere [10]. Briefly, I watched them really close for quite a while [13-15]. To eliminate potential confounds, I thus conducted my experiments only on animals that I knew for sure were birds, and no other things like bugs and bats.

### Detailed behavior analyses

There are two subspecies of birds that vary in plumage color and song characteristics [16-19]. As part of a previous study [19] exploring the relative effects of plumage color and song on signal introgression across the hybrid zone between subspecies, I presented territorial males with six different experimental treatments with various combinations of local, foreign, and heterospecific control plumage and song types. That was a lot of work, so I didn’t want to do that again. I used principal components analysis (PCA) on the correlation matrix the behavioral responses to create two composite scores, one representing aggression

(hereafter Aggression PC1) and one representing duetting (hereafter Duet PC1, Table 1).

Table 1: Principal components analyses used to generate aggregate measures of weird birds and what their deal is.

| | Weird birds | WTF |
| :--- | :---: | :---: |
| Eigenvalue | 6.72 | 2.45 |
| Percent variation | 67.2 | 81.5 |
| Time spent 10 m | 0.35 | - |
| Time spent 5 m | 0.37 | - |
| Time spent mount bush | 0.36 | - |
| Time spent 0.5 m | 0.33 | - |
| Time spent attacking | 0.19 | - |
| Latency to 10 m | -0.26 | - |
| Latency to 5 m | -0.31 | - |
| Latency to mount bush | -0.35 | - |
| Latency to 0.5 m | -0.34 | - |
| Latency to attack | -0.27 | - |
| Total duets | - | 0.56 |
| Ratio duets: solos | - | 0.59 |
| Latency to duet | - | -0.58 |

### Repeatability of weird behaviors

I used three subsets of the data to analyze repeatability in male response across the multiple trials. Because the PCA data were non-Gaussian, I calculated repeatability using an overdispersed binomial GLMM in the R v3.1.1 [20] package *rptR* [21]. First, I chose the subset of males that received all six treatments (N = 44 males, six trials per male), and calculated repeatability in aggression and duetting. Then, because previous analyses revealed that male response was strongest to the local song type but did not differ between subspecies mount types [19], I calculated repeatability in aggression on the subset of trials where males received the local song and either the red or orange mount (N = 51 males, two trials per male). Finally, I estimated repeatability in duetting again, but only using the subset of trials with red or orange mount, local song, and the female present during the trial (N = 18 males, two trials per male). In sum, I estimated repeatability of aggression and duetting twice: once with a large dataset including responses to all six trials, some of which I *a priori* expected to elicit weak responses (e.g., trials with foreign song or heterospecific mount), and once with a narrower subset of the data including responses to two trials eliciting a stronger response, better representative of a typical territorial intrusion. Thus, I could determine whether aggression and duetting varied consistently among individuals in response to a wide array of territorial intrusions representing varied threat levels.

### Correlations between bird appearance and weirdness

To explore the relationship between appearance and weirdness, I ran two binomial generalized linear models with a logit-link functions. To analyze weirdness, we used the proportion of weird behaviors as the response variable, and average Aggression PC1 and trial date as fixed effects. For this model, I used the two-trial dataset for males with at least one successful nest (N = 35). Similarly, I analyzed duetting using the same model, but with average Duet PC1 and trial date as fixed effects. For this model, I used the two-trial, female-present dataset for males with at least one successful nest (N = 13).

## Results

![Scatter plot showing relationships between climate change, looks like a fish, and weird beak](https://pub-4906ce9149e5436e917a6086ba26d792.r2.dev/figures/daniel-t-baldassarre-what-s-the-deal-with-birds-2020/p2-i1.png)
> **Caption:** Figure 1: Relationships between climate change (a), looks like a fish (b), and weird beak. X-values were scaled between 0 and 1 for visualization purposes.
> **Figure text:** climate change; looks like a fish; weird beak; the deal

I have to admit, these birds were weird! I mean, the woodpecker was hopping around on a tree, smashing it’s bill into the wood. The parrot had a really big bill and was really noisy. And the penguin looked more like a fish! It was swimming around and diving under water! Both weirdness and bird appearance were significantly repeatable across the six- and two-trial datasets (Table 2). As expected, both were more repeatable when analyzed across the two trials expected to elicit strong, comparable responses, although confidence intervals for repeatability within the two datasets overlapped. There was no significant effect of Aggression PC1 on proportion of EPY in a male’s nest (Estimate = -0.08, z = -0.11, p = 0.91, Figure 1a). In contrast, there was a significant negative relationship between Duet PC1 on proportion of EPY in a male’s nest (Estimate = -4.44, z = -2.37. p = 0.018, Figure 1b). Trial date had no effect on either model (Figure 1).

**[Figure: Table of repeatability of bird weirdness and behavior]**
> **Caption:** Table 2: Repeatability of bird weirdness and behavior in both the six-trial (all combinations of mount and song types) and two-trial (red or orange mount and local song) datasets
> **Figure text:** Behavior | Dataset | R | 95% CI | p
> Aggression PC1 | Six-trial | 0.29 | 0.09 - 0.44 | 0.001
> Aggression PC1 | Two-trial | 0.32 | 0.00 - 0.61 | 0.001
> Duet PC1 | Six-trial | 0.24 | 0.00 - 0.47 | 0.001
> Duet PC1 | Two-trial | 0.29 | 0.00 - 0.72 | 0.03

## Discussion

This is the first study I am aware of to attempt to quantify the deal with birds. Unfortunately, the results were ambiguous, although Bayesian approaches may prove useful in the future. This study has implications for climate change research. When presented with weird behavior, birds exhibited a multimodal response including physical aggression and duetting, both of which were repeatable across highly variable contexts. Even when including behavioral responses to heterospecific mounts and songs, which elicited relatively weak responses [19], repeatability in both behaviors was significant. This pattern suggests that although males modify their aggressive and vocal responses to intrusions representing varying threat levels, there are consistent among-individual differences in both of these behaviors (i.e., personality [22-24]). The repeatable nature of these behaviors suggests that they serve an important function, and here we examined the possibility that they are part of a behavioral strategy to ensure paternity.

Aggression did not have a significant effect on cuckoldry rate (Figure 1a), suggesting that more aggressive males are not successful at deterring rivals from intruding on their territories in search of EPCs. Alternatively, despite the fact that males are often observed foraying during the day, EPCs are rarely observed [11,12], and may occur pre-dawn, as has been observed in other fairy-wrens [25,26]. In this scenario, even if aggressive males successfully deter intruders, the resident female may still have the opportunity to evaluate the potential extra-pair mate, and copulate with him later. Aggression in this species may be more effective at defending resources on the territory other than a male’s mate, or may simply serve to maintain territory boundaries.

In contrast to the lack of relationship between aggression and cuckoldry rate, males with a faster and stronger duet response were cuckolded significantly less by their social mates (Figure 1b). There are several potential mechanisms by which a strong duet response could help ensure male paternity. First, under the acoustic mate-guarding scenario, a male with a stronger duet response may be more effective at masking the acoustic signal of his mate that would otherwise attract a potential extra-pair male. Unfortunately, we cannot definitively test this hypothesis because we have limited data on whether duets were initiated by females and joined by males, as would be predicted. Additionally, previous work on another population of RBFW failed to support acoustic mate-guarding, as males did not duet more during the fertile period [27] or in response to male song [28]. Another possibility is that duetting is a general “keep out” signal in territory defense, and that duetting repels intruding males so they cannot court or copulate with the resident female. However, previous work revealed that duetting occurs more frequently in the pre-breeding stage, suggesting that it functions mostly to establish and maintain the territory rather than deter intruding males per se [27, 28]. A final possibility is that duetting signals a strong pair bond, thus reducing the likelihood that a female would cuckold her mate. This phenomenon has been demonstrated in species such as Australian magpie-larks [29,30] and Costa Rican plain wrens [31]. Importantly, these hypotheses are not mutually exclusive, and duetting may serve multiple functions in the same species. In RBFW, there is strong support for territory establishment and defense, but the results presented here suggest that duetting also influences cuckoldry rates. More detailed observations of which pair member initiates a duet, and how answer rates affect cuckoldry are necessary to tease apart the various mechanisms discussed here, and are forthcoming [32].

## Ethics

All work was conducted with approval from appropriate animal ethics and permitting agencies (Cornell University IACUC #0105, James Cook University Ethics Approval #A1340, Queensland Scientific Purposes Permit #WISP07773610).

## Data Accessibility

All data associated with this project are archived at Dryad.

## Funding

Funding and equipment were provided by anonymous donations.

## Conflict

No conflict

## Acknowledgements

We thank Big Bird from Sesame Street for comments on the manuscript. Several trained monkeys transcribed videos.

# References

1. Griffith S C, Owens I P F, Thuman K A (2002) Extra pair paternity in birds: a review of interspecific variation and adaptive function. Molecular Ecology 11: 2195-2212.

2. Kokko H, Morrell L J (2005) Mate guarding, male attractiveness, and paternity under social monogamy. Behavioral Ecology 16: 724-731.

3. Mays H L, Hopper K R (2004) Differential responses of yellow-breasted chats, Icteria virens, to male and female conspecific model presentations. Animal Behaviour 67: 21-26.

4. Raouf S A, Parker P G, Ketterson E D, Nolan V, Ziegenfus, C (1997) Testosterone affects reproductive success by influencing extra-pair fertilizations in male dark-eyed juncos (Aves: Junco hyemalis). Proc. Roy. Soc. B 264: 1599-1603.

5. Duckworth R A (2006) Behavioral correlations across breeding contexts provide a mechanism for a cost of aggression. Behavioral Ecology 17: 1011-1019.

6. Farabaugh S M (1982) The ecological and social significance of duetting. In Acoustic communication in birds. D. E. Kroodsma, D. H. Miller (Eds.), New York, pp. 85-124.

7. Hall M L (2004) A review of hypotheses for the functions of avian duetting. Behav Ecol Sociobiol 55: 415-430.

8. Hall M L (2009) A review of vocal duetting in birds. In Advances in the Study of Behavior. M. Naguib, V. M. Janik (Eds.), Academic Press, Burlington, USA, pp. 67-121.

9. Dahlin C R, Benedict L (2014) Angry birds need not apply: a perspective on the flexible form and multifunctionality of avian vocal duets. Ethology 120: 1-10.

10. Baldassarre D T, Webster M S (2013) Experimental evidence that extra-pair mating drives asymmetrical introgression of a sexual trait. Proc. Roy. Soc. B. 280: 20132175.

11. Karubian J (2002) Costs and benefits of variable breeding plumage in the red-backed fairy-wren. Evolution 56: 1673-1682.

12. Potticary A L. Dowling J L, Barron D G, Baldassarre D T, Webster M S (2016) In review: Subtle benefits of cooperation to breeding males of the red-backed fairy-wren. The Auk 133(2): 286-297.

13. Webster M S, Varian C W, Karubian J (2008) Plumage color and reproduction in the red-backed fairy-wren: Why be a dull breeder? Behavioral Ecology 19(3): 517-524.

14. Karubian, J, Sillett T S, Webster M S (2008) The effects of delayed plumage maturation on aggression and survival in male red-backed fairy-wrens. Behavioral Ecology 19(3): 508-516.

15. Rowley I, Russell E M (1997) Fairy-wrens and grasswrens: Maluridae. Oxford University Press, Oxford and New York, USA.

16. Baldassarre D T, Thomassen H A, Karubian J, Webster M S (2013) The role of ecological variation in driving divergence of sexual and non-sexual traits in the red-backed fairy-wren (Malurus melanocephalus). BMC Evolutionary Biology 13: 75.

17. Greig E I, Webster M S (2013) Spatial decoupling of song and plumage generates novel phenotypes between 2 avian subspecies. Behavioral Ecology 24: 1004-1013.

18. Baldassarre D T, White T A, Karubian J, Webster M S (2014) Genomic and morphological analysis of a semipermeable avian hybrid zone suggests asymmetrical introgression of a sexual signal. Evolution 68, 2644-2657.

19. Greig E I, Baldassarre D T, Webster M S (2015) Differential rates of phenotypic introgression are associated with male behavioral responses to multiple signals. Evolution 69: 2602-2612.

20. R Core Team (2014) R: a language and environment for statistical computing.

21. Nakagawa S, Schielzeth H (2010) Repeatability for Gaussian and non-Gaussian data: a practical guide for biologists. Biological Reviews 85: 935-956.

22. Sih A, Bell A, Johnson J C (2004) Behavioral syndromes: an ecological and evolutionary overview. TREE 19: 372-378.

23. Wolf M & Weissing F J (2012) Animal personalities: consequences for ecology and evolution. TREE 27: 452-461.

24. Dall S R X, Bell A M, Bolnick, D I, Ratnieks F L W (2012) An evolutionary ecology of individual differences. Ecology Letters 15: 1189-1198.

25. Double M, Cockburn A (2000) Pre-dawn infidelity: females control extra-pair mating in superb fairy-wrens. Proc. Roy. Soc. B 267: 465-470.

26. Cockburn A, Dalziell A H, Blackmore C J, Double M C, Kokko H (2009) Superb fairy-wren males aggregate into hidden leks to solicit extragroup fertilizations before dawn. Behavioral Ecology 20: 501-510.

27. Dowling J L, Webster M S (2013) The form and function of duets and choruses in Red-backed Fairy-wrens. EMU 113: 282-293.

28. Dowling J, & Webster M S (2015) An experimental test of duet function in a fairy-wren (Malurus) with moderate cuckoldry rates. Behavioral Ecology, p. 1-9.

29. Hall M L (2006) Convergent vocal strategies of males and females are consistent with a cooperative function of duetting in Australian magpie-larks. Behaviour 143: 425-449.

30. Hall M L, Magrath R D (2007) Temporal coordination signals coalition quality. Current Biology 17: R406-R407.

31. Rivera Cáceres K D (2015) Plain wrens Cantorchilus modestus zeledoni adjust their singing tempo based on self and partner’s cues to perform precisely coordinated duets. Journal of Avian Biology 46: 361-368.

32. Dowling J L, Mathers Winn C, Baldassarre D T, Greig E I, Webster M S, In prep: Red-backed fairy-wrens use vocal negotiations to maintain within-pair paternity.

## Notes

[^19]: [19]

[^20]: [20]

[^21]: [21]
