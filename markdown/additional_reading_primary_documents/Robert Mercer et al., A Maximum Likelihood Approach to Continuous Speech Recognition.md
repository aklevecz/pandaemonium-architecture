IEEE TRANSACTIONS ON PATTERN ANALYSIS AND MACHINE INTELLIGENCE, VOL. PAMI-5, NO. 2, MARCH 1983                                                  179


       A Maximum Likelihood Approach to Continuous
                  Speech Recognition
             LALIT R. BAHL, MEMBER, IEEE, FREDERICK JELINEK, FELLOW, IEEE, AND ROBERT L. MERCER



  Abstract-Speech recognition is formulated as a problem of maximum
likelihood decoding. This formulation requires statistical models of the          TE                       T    ACOUSTIC      LINGUISTIC

speech production process. In this paper, we describe a number of sta-         GENERATOR   ----aSPEAKER        PROCESSOR   __.DECODER
tistical models for use in speech recognition. We give special attention
to determining the parameters for such models from sparse data. We                                                 SPEECH RECOGNIZER
also describe two decoding methods, one appropriate for constrained                     Fig. 1. A continuous speech recognition system.
artificial languages and one appropriate for more realistic decoding
tasks. To illustrate the usefulness of the methods described, we review
a number of decoding results that have been obtained with them.
                                                                                 TEXT            SPEAKER       ACOUSTIC        LINGUISTIC   w
  Index Terms-Markov models, maximum likelihood, parameter esti-               GENERATOR                       PROCESSOR        DECODER



mation, speech recognition, statistical models.                                                     ACOUSTIC CHANNEL

                                                                              Fig. 2. The communication theory view of speech recognition.
                       I. INTRODUCTION
THE AIM of research in automatic speech recognition is                       In addition to the constraint imposed by the task domain,
                                                                           the experimental environment is often restricted in several
      the development of a device that transcribes natural speech
automatically. Three areas of speech recognition research can              other ways. For example, at IBM speech is recorded with a
be distinguished: 1) isolated word recognition where words are             headset microphone; the system is tuned to a single talker; the
separated by distinct pauses; 2) continuous speech recognition             talker is prompted by a script, false starts are eliminated, etc.;
where sentences are produced continuously in a natural man-                recognition often requires many seconds of CPU time for each
ner; and 3) speech understanding where the aim is not tran-                second of speech.
scription but understanding in the sense that the system (e.g.,              The basic CSR system consists of an acoustic processor
a robot or a database query system) responds correctly to a                (AP) followed by a linguistic decoder (LD) as shown in Fig. 1.
spoken instruction or request. Commercially available prod-                Traditionally, the acoustic processor is designed to act as a
ucts exist for isolated word recognition with vocabularies of              phonetician, transcribing the speech waveform into a string of
up to several hundred words.                                               phonetic symbols, while the linguistic decoder translates the
  Although this article is confined to continuous speech recog-            possibly garbled phonetic string into a string of words. In
nition (CSR), the statistical methods described are applicable             more recent work [1] -[6], the acoustic processor does not
to the other two areas of research as well. Acoustics, phonet-             produce a phonetic transcription, but rather produces a string
ics, and signal processing are discussed here only as required to          of labels each of which characterizes the speech waveform lo-
provide background for the exposition of statistical methods               cally over a short time interval (see Section II).
used in the research carried out at IBM.                                     In Fig. 2, speech recognition is formulated as a problem in
  Products which recognize continuously spoken small vocabu-               communication theory. The speaker and acoustic processor
laries are already on the market but the goal of unrestricted              are combined into an acoustic channel, the speaker transform-
continuous speech recognition is far from being realized. All              ing the text into a speech waveform and the acoustic processor
current research is carried out relative to task domains which             acting as a data transducer and compressor. The channel pro-
greatly restrict the sentences that can be uttered. These task             vides the linguistic decoder with a noisy string from which it
domains are of two kinds: those where the allowed sentences                must recover the message-in this case the original text. One is
are prescribed a priori by a grammar designed by the experi-               free to modify the channel by adjusting the acoustic processor
menter (referred to as artificial tasks), and those related to a           but unlike in communications, one cannot choose the code be-
limited area of natural discourse which the experimenter tries             cause it is fixed by the language being spoken. It is possible to
to model from observed data (referred to as natural tasks).                allow feedback from the decoder to the acoustic processor but
Examples of natural tasks are the text of business letters,                the mathematical consequences of such a step are not well
patent applications, book reviews, etc.                                    understood. By not including feedback we facilitate a consis-
                                                                           tent and streamlined formulation of the linguistic decoding
                                                                           problem.
 Manuscript received February 23, 1981; revised September 28, 1982.
 The authors are with the IBM T. J. Watson Research Center, York-            The rest of this article is divided as follows. Section II gives
town Heights, NY 10598.                                                    a brief summary of acoustic processing techniques. Section

                                              0162-8828/83/0300-0179$01.00 © 1983 IEEE
180                IEEE TRANSACTIONS ON PATTERN ANALYSIS AND MACHINE INTELLIGENCE, VOL. PAMI-5, NO. 2, MARCH 1983

III formulates the problem of linguistic decoding and shows          mize the probability of error, w must be chosen so that
the necessity of statistical modeling of the text and of the
                                                                        P(lw|y) = maxP(w|y).                                     (3.1)
acoustic channel. Section IV introduces Markov models of                              w
speech processes. Section V describes an elegant linguistic
decoder based on dynamic programming that is practical under         By Bayes' rule
certain conditions. Section VI deals with the practical aspects
                                                                        P(wfIy)=~ P(y) I
                                                                                  P(W) P(Y w)
of the sentence hypothesis search conducted by the linguistic                                                                    (3.2)
decoder. Sections VII and VIII introduce algorithms for ex-
tracting model parameter values automatically from data. Sec-         Since P(y) does not depend on w, maximizingP(wjy) is equiv-
tion IX discusses methods of assessing the performance of CSR         alent to maximizing the likelihood P(w, y) = P(w) P(y fw).
systems, and the relative difficulty of recognition tasks. Fi-        Here P(w) is the a priori probability that the word sequence w
nally, in Section X we illustrate the capabilities of current rec-   will be produced by 'the text generator, and P(y 1w) is the
ognition systems by describing the results of certain recogni-       probability with which the acoustic channel (see Fig. 1) trans-
tion experiments.                                                     forms the word string w into the AP output stringy.
                                                                        To estimate P(w), the LD requires a probabilistic model of
                  II. ACOUSTIC PROCESSORS                             the text generator, which we refer to as the language model.
    An acoustic processor (AP) acts as a data compressor of the       For most artificial tasks, the language modeling problem is
 speech waveform. The output of the AP should 1) preserve            quite simple. Often the language is specified by a small finite-
 the information important to recognition and 2) be amenable         state or context-free grammar to which probabilities can be
to statistical characterization. If the AP ou'tput can be easily     easily attached. For example, the Raleigh language (see Sec-
interpreted by people, it is possible to judge the extent to         tion IV) is specified by Fig. 7 where all words possible at any
which the AP fulfills requirement 1).                                point are considered equally likely.
   Typically, an AP is a signal processor, which transforms the         For natural tasks the estimation of P(w) is much more diffi-
speech waveform into a string of parameter vectors, followed         cult. Linguistics has not progressed to the point that it can
by a pattern classifier, which transforms the string of parame-      provide a grammar for a sizable subset of natural English,
ter vectors into a string of labels from a finite alphabet. If the   which is useful for speech recognition. In addition, the inter-
pattern classifier is absent, then the AP produces an unlabeled      est in linguistics has been in specifying the sentences of a lan-
string of parameter vectors. In a segmenting AP, the speech          guage, but not their probabilities. Our approach has been to
waveform is segmented into distinct phonetic events (usually         model the text generator as a Markov source, the parameters
phones1) and each of these'varying length portions is then           of which are estimated from a large sample of text.
labeled.                                                                To estimate P(y 1w), the other component of the likelihood,
   A time-synchronous AP produces parameter vectors com-             the LD requires a probabilistic model of the acoustic chan-
puted from successive fixed-length intervals of the speech           nel, which must account for the speaker's phonological and
waveform. The distance from the parameter vector to each of          acoustic-phonetic variations and for the performance of the
a finite set of standard parameter vectors, or prototypes, is        acoustic processor. Once models are available for computing
computed. The label for the parameter vector is the name of          P(w) and P(y{w), it is in principle possible for the LD to com-
the prototype to which it is closest.                                pute the likelihood of each sentence in the language and deter-
   In early acoustic processors, prototypes were obtained from       mine the most likely w directly. However, even a small artifi-
speech data labeled by an expert phonetician. In more recent         cial language such as the Raleigh language has several million
acoustic processors, prototypes are obtained automatically           possible sentences. It is therefore necessary in practice to
from unlabeled speech data [3], [4].                                 carry out a suboptimal search. A dynamic programming
   A typical example of a time-synchronous AP is the IBM             search algorithm, the applicability of which is limited to tasks
centisecond acoustic processor (CSAP). The acoustic param-           of moderate complexity, is described in Section V. A more
eters used by CSAP are the energies in each of 80 frequency          general tree search decoding algorithm is described in Sec-
bands in steps of 100 Hz covering the range from 0-8000 Hz.          tion VI.
They are computed once every centisecond using a 2 cs win-                        IV. MARKOV SOURCE MODELING OF
dow. The pattern classifier has 45 prototypes corresponding                                SPEECH PROCESSES
roughly to the phones of English. Each prototype for a given
speaker is obtained from several samples of his speech which Notation and Terminology
has been carefully labeled by a phonetician.                          By a Markov source, we mean a collection of states con-
                                                                    nected to one another by transitions which produce symbols
                   III. LINGUISTIC DECODER                          from a finite alphabet. Each transition t from a state s has
  The AP produces an output stringy. From this stringy, the associated with it a probability q,(t) which is the probability
linguistic decoder (LD) makes an estimate w of the word that t will be chosen next when s is reached. From the states
string w produced by the text generator (see Fig. 1). To mini- of a Markov source we choose one state as the initial state and
                                                                    one state as the final state. The Markov source then assigns
   1 For an introductory discussion of phonetics, see Lyons 17, pp. probabilities to all strings of transitions from the initial state
99-1321                                                             to the final state. Fig. 3 shows an example of a Markov source.
 BAHL et al.: CONTINUOUS SPEECH RECOGNITION                                                                                                           181




                                                                                0




                                                                                                                                      0


                      Fig. 3. A Markov source.

                                                                                         Fig. 4. A Markov source with null transitions.
   We define a Markov source more formally as follows. Let S
be a finite set of states, J a finite set of transitions, and (d a
finite alphabet. Two elements of 8, s1 and SF are distinguished
as initial and final states, respectively. The structure of a Mar-
kov source is a 1-1 mapping M: Jf-+ S X ( X S. If M(t)                              MARKOV
                                                                                                   al,..., ant,....               bit ... bmt,
(1, a, r) then we refer to 1 as the predecessor state of t, a as the                SOURCE   SOURCE .,                FILTER
output symbol associated with t, and r as the successor state of
t; we write I = L(t), a = A (t), and r = R(t).
   The parameters of a Markov source are probabilities q,(t),
sES - {SF}, t E , such that                                                                   Fig. 5. A filtered Markov source.

  qs(t)=O       if s#L(t)                                                           bi            #)         ¢          b2        0              b3
and
    E qs(t) = I,    s E S - {SF}.                             (4.1)    Fig. 6. A sequence of transitions to illustrate spanning. b, spans tl;
    t                                                                                 b2 spans t2, t3, t4; and b3 spans t5, t6-
   In general, the transition probabilities associated with one
state are different from those associated with another. How-               In practice it is useful to allow transitions which produce no
ever, this need not always be the case. We say that state s1 is output. These null transitions are represented diagrammati-
tied to state s2 if there exists a 1-1 correspondence T,,2: To cally by interrupted lines (see Fig. 4). Rather than deal with
J such that qs1 (t) = q,2(Ts, ,2(t)) for all transitions t. It is null transitions directly, we have found it convenient to asso-
easily verified that the relationship of being tied is an equiva- ciate with them the distinguished latter 4. We then add to the
lence relation and hence induces a partition of S into sets of Markov source a filter (see Fig. 5) which removes O, transform-
states which are mutually tied.                                          ing the output sequence a' into an observed sequence b',
  A string of n transitions 2tln for which L(t1) = s, is called a where bi E 5I = d - {f}. Although more general sources can
path; if R(t,) = SF, then we refer to it as a complete path. The be handled, we shall restrict our attention to sources which do
probability of a path tl is given by                                     not have closed circuits of null transitions.
                         n                                                 If t1 is a path which produces the observed output sequence
    P(j) qsI(ti)    fH       qR(ti_l)(ti).                         (4.2) bm,   then we say that bi spans tj if tj is the transition which
                        i=2                                              produced bi or if tj is a null transition immediately preceding a
                                                                         transition spanned by bi. For example, in Fig. 6, b1 spans
Associated with path tn is an output symbol string a' =A (tn).              ; b2 spans t2, t3, and t4; and b3 spans tS and t6.
A particular output string an, may in general arise from more t, A
                                                                               major advantage of using Markov source models for the
than one path. Thus, the probability P(al') is given by                  text generator and acoustic channel is that once the structure
    p(an ) =Ep(tn ) b(A (tn ), asn)                                (4.3) is specified, the parameters can be estimated automatically
              tIn                                                        from data (see Sections VII and VIII). Furthermore, compu-
                                                                         tationally efficient algorithms exist for computing P(w) and
where                                                                    P(y|w) with such models (see Sections V and VI). Markov
                  1 if a=b                                               source models also allow easy estimation of the relative diffi-
                    otherwise.(4.4)
    6(a, b)= 00 otherwise.                                               culty of recognition tasks (see Section IX).
A Markov source for which each output string a' determines a The Language Model
unique path is called a unifilar Markov source.                            Since the language model has to assign probabilities to
                                                                         strings of words, it is natural for its output alphabet to be the
  2te is* a short-hand notation     for the concatenation of the symbols vocabulary of the language. However, the output alphabet can
tl, t2,
      -
          *, tn.  Strings are indicated in boldface throughout.          include shorter units such as word stems, prefixes, suffixes,
182                  IEEE TRANSACTIONS ON PATTERN ANALYSIS AND MACHINE INTELLIGENCE, VOL. PAMI-S, NO. 2, MARCH 1983

                                                                         co'.S' .ee
                                                                         created                                               b-6
                                                                         gove                                                    mpa,gn
                                                                         hked
                                                                         mnade
                                                                                                                               Cf:.d
                                                                                                                               9
                                                                         moved                                                 rnol ion
                                                                         per-Oted                                              name
                                                                                                                               radio
                                                                         wanted         cho-ges
                                                                                        does                                   ship
                                                                                          ghts                                 state
                             liod                                                       :e,els                                 folophone             approaches
                             block                   cond-                              goes                                   th.ng                 ;n
                                                                                                                                                        rjmevs
                             Ont le
                             great                       I'on
                                                     du 'a
                                                     general             contr.buted     Ives                                  weapon                ISS"S
                                                                                                                                                     locotions
                             pr.marI
                             Pfoft
                                 'c an
                                                     spe,tro,rl
                                                            1            cr,tc.z:d
                                                                         dIsturb
                                                                                                                 U.
                                                                                                             captom
                                                                                                                           Ing             oc'oss
                                                                                                                                           at
                                                                                                                                           fro-
                                                                                                                                                     oporot.ons
                                                                                                                                                     plans
                             qu, 0
                             loc ogn.         0 11
                                                           age
                                                                         forgot
                                                                         governed
                                                                                                             c 0 use
                                                                                                             city
                                                                                                                                           O"
                                                                                                                                           toward
                                                                                                                                                     probloms
                                                                                                                                                     sites
                                                                                                             country
                              -l-IC11
                              TV"                                        had
                                                                         shoed         appeors
                                                                                       oppro,,es
                                                                                                             letter
                                                                                                             major
                                                                                                                                           u-der     zones

                        F                                                              d,,nks                m

               0-0                 t-,r.-t-
                                                                              -&--                           n
                                                                                                             off actLn:   on
                                                                                                                                           ago.nst
                             eoger                                                      ;S
                                                                                        ooks                 rep art
                                                                                                                     r
                                                                                                                      co                   fo,
                                                                                                                                                     o,rPlW
                                                                                                                                                     business
                             knd                     Po                  ocCo-pTe-&-   ,okes                 though,                       M         engine
                             large                   pe                  apphed        lorks                                               nto       moch,ne
                                                                                                                                                              I4
                             10.
                                                     p                   brought                                                           through   MISS
                                                                                                                                                       oment
                                  ny                                     detected                  ago,                                    -0        orde r
                                                                                                   ecess-.Iely
                C.          I:rue
                              gly
                                  red
                                                     110,   11           found
                                                                         outlawed
                                                                             ""C"'d
                                                                                                   leos,
                                                                                                    0)0"ly
                                                                                                                                                     product
                                                                                                                                                     Use
                                                                         S.,.d          ash          Ore y
                                                                                        ge,         ostly
                                                                                                   no,
                                                                                        k-OW
                             -a        ve
                                                                                        ,,ok*      on.1 y
                                                                                                   pr ricIpolly
                                                                                       pay                                                           C nce'n
                             deroc,ol-,                                                            9,ope,ly                                          cove,
                             fa                                                         'a"
                                  Itle               peopie              b             isulv-
                                                                                          ere
                                                                                              ve
                                                                                                   stomet"Iles
                                                                                                    r.1y                                   befo,'e   doy
                                                                                                                                           0verrn,
                                                                                                                                           d
                             pooc,
                             PIO       hCal          PoCt
                                                     s,,ee;S'e
                                                                         c
                                                                         Cally
                                                                          Dnf,ol                             alwoys                        post      lp Uf'OP 0 s 0
                             se,3.                   t'eol ,es           love                                f; y                          ."h       soc
                                                                                                                                                           I'fice
                d'            of
                             Shor
                             s1rong
                                                         orke,            1,nk
                                                                         " n  y        Ti-1,e-ve
                                                                                                                  no
                                                                                                             fequenlly
                                                                                                             less
                                                                                                                                                     veh.110
                                                                                                                                                     week

                                                                         iu-r          come                  more
                                                                                       do                    nevor                         aboul
                                                                                       d.'eci                OCc. S'0.011Y                 after     COr"IDS
                             bockwo d                                                   folio.               oflen                         onong     f, I Ids
                                                                                                                                                     hoL S.S
                             bg
                                                                                                             onct
                                                      ac     ons                       proceed                                             beWen
                             c ose                    b.ses                            see.                  usually                       by        mle"OS s
                             good                     bat,(*$                          Istand                rarely                                  me hods
                             ..Po,tont
                             old
                                                      comma
                                                      fo,r,,S
                                                                   "i                                        soldomly                      W'thout
                                                                                                                                                     sc,*nt ts
                                                                                                                                                     se I v   C'ess
                             pass-ve                  grounds                                                                                        soldiers
                             Sep
                                  'gged               places
                                                                                                                                                     SYS   terns
                                                                                                                                                     Thrl-ques
                            1,,seale'Oss"
                                                                        Fig. 7. Grammar of the Raleigh language.

 etc., from which word sequences can be derived. Fig. 7 is the
model of the artificial Raleigh language which has been used in
some of our experiments. The output alphabet is the 250-
word vocabulary of the language. For diagrammatic conve-                                                                                                              -60--


nience, sets of transitions between pairs of states have been re-
placed by single transitions with an associated list of possible
output words.                                                                     Fig. 8. A word-based Markov subsource.
   For natural languages, the structure of the model is not given
a priori. However,                                                 articulation, talker's position relative to the microphone, am-
                                                                  bient  noise, etc.
    P(W71)= P(W1)P(W2fWi)P(w3Jw)  | )       P(wn IwI)                We will only consider the problem of modeling the acoustic
              n                                                   channel for single words. Models for word strings can be con-
              fH P(Wk
             k=1
                        W               1)
                                                            (4.5) structed by concatenation of these simpler, single word mod-
                                                                  els. Fig. 8 is an example of the structure of a Markov source
and so it is natural to consider structures for which a word for a single word. The double arcs represent sets of transitions,
string wkyl uniquely determines the state of the model. A one for each symbol in the output alphabet. The straight-line
particularly simple model is the N-gram model where the path represents pronunciations of average length, while the
state at time k - 1 corresponds to the N - 1 most recent transitions above and below can lengthen and shorten the pro-
words Wk - N + 1,*, Wk -1. This is equivalent to using the nunciation, respectively. Since the pronunciation of a word
approximation                                                     depends on the environment in which it occurs, it may be nec-
                                                                  essary in practice to make the parameters of the model depend
                                                                  on the phonetic environment provided by the preceding and
  P(wD    - H P(Wk k Nw
             k=1
                           - )                                    following words.
                                                                     Since the same sounds can occur in many different words,
N-gram models are computationally practical only for small portions of one model will be similar to portions of many
values of N. In order to reflect longer term memory, the state other models. The number of parameters required to specify
can be made dependent on a syntactic analysis of the entire all the word models can be reduced by modeling sounds or
past word string w,       as might be obtained from an appro- phones rather than words directly. This leads to a two-level
                              ,



priate grammar of the language.                                   model in which word strings are transformed into phone
                                                                  strings which are then transformed into AP output strings. Us-
The Acoustic Channel Model                                        ing this approach, the acoustic channel model is built up from
   The AP is deterministic and hence the same waveform will two components: a set of phonetic subsources, one for each
always give rise to the same AP output string. However, for a word; and a set of acoustic subsources, one for each phone.
given word sequence, the speaker can produce a great variety         Let? be the alphabet of phones under consideration. A
of waveforms resulting in a corresponding variation in the AP phonetic subsource for a word is a Markov source with output
output string. Some of the variation arises because there are alphabet 5P which specifies the pronunciations possible for the
many different ways to pronounce the same word (this is word and assigns a probability to each of them. Fig. 9 shows
called phonological variation). Other factors include rate of the structure of a phonetic Markov subsource for the word
BAHL et al.: CONTINUOUS SPEECH RECOGNITION                                                                                                  183

                                       hv                   u                  AP string y', the complete path t1 which maximizes the
                                                                               probability P(t4) subject to the constraint Y(t1) =y7. A de-
                                                                               coder based on this strategy would then produce as its output
                                                                                W(t4). This decoding strategy is not optimal since it may not
                                                                  v            maximize the likelihood P(w, y). In fact, for a given pair w,y
                    Fig. 9. A phonetic Markov subsource.                       there are many complete paths t for which W(t) = w and
                                                                                Y(t) =y. To minimize the probability of error, one must sum
                                                                               P(t) over all these paths and select the w for which the sum is
                                                                               maximum. Nevertheless, good recognition results have been
                                                                               obtained using this suboptimal decoding strategy [ 1], [2], [9] .
                                                                                  A simple method for finding the most likely path is a dy-
                                                                               namic programming scheme [10] called the Viterbi Algorithm
                   Fig. 10. An acoustic Markov subsource.                       [11] . Let Tk(S) be the most probable path to state s which
                                                                               produces output yIk. Let Vk(S) = P(Tk(s)) denote the probabil-
                           ACOUSTIC                    ACOUSTIC                ity of the path Tk(S). We wish to determine 'Tm(SF).3 Because
                           SUBSOURCE
                           OF PHONE
                                                      SUBSOURCE
                                                      OF PHONE                 of the Markov nature of the process, Tk(S) can be shown to be
                                                                               an extension of rk -(S') for some s'. Therefore, Tk(S) and
     ACOUSTIC
     SUBSOURCE
                       I                    \/
                                            /
                                                                               Vk(s) can be computed recursively from Trk -1 (s) and Vk - 1 (s)
     O))FP HO NE           e                A~~~~~I/
                                             <_                                starting with the boundary conditions VO(s1)= 1 and 'r(s1)
            t
                                                 ACOUSTIC          ACOUSTIC    being the null string. Let C(s, a) = {t|R(t) . s, A(t) = a}.
                                                SUBSOURCE
                                                OF PHONE
                                                                  SUBSOURCE
                                                                      O   HN   Then
                                                                                   Vk(s) = max {max        Vk -1 (L(t)) qL(t)(t),
Fig. 11. A phone-based Markov source based on the phonetic subsource                           t E C(s, Yk)
                             of Fig. 9.
                                                                                            max       Vk(L(t)) qL(t)(t)}-                 (5.1)
                                                                                          teC(s, 0)
two. The structures of these subsources may be derived by the    If the maximizing transition t is in C(S, Yk) then 1rk(S) =
application of phonological rules to dictionary pronunciations     k-1 (L(t)) t; otherwise t must be in C(s, 0) and 'ik(S) =
for the words [8].                                               Tk(L(t)) t, where denotes concatenation. Note that in (5.1)
                                                                                                  -


  An acoustic subsource for a phone is a Markov source with      Vk(s) depends on Vk(L(t)) for tEC(s, '). Vk(L(t)) must
output alphabet 'Y which specifies the possible AP output        therefore be computed before Vk(s). Because closed circuits
strings for that phone and assigns a probability to each of      of null loops are not allowed,3 it is possible to order the states
them. Fig. 10 shows the structure of an acoustic Markov sub-     S1, S2, S3, * * *, such that t E C(sk, 0) and L(t) = s; only ifj<
source used with the IBM Centisecond Acoustic Processor.         k. If we then compute Vk(sl), Vk(s2), etc., in sequence, the
  By replacing each of the transitions in the phonetic sub-      necessary values will always be available when required.
source by the acoustic subsource for the corresponding phone,      Many shortcuts to reduce the amount of computation and
we obtain a Markov source model for the acoustic channel.        storage are possible and we will briefly mention some of the
This embedding process is illustrated in Fig. 11.                more useful ones. If logarithms of probabilities are used, no
  Whereas the structure of the phonetic subsources can be de-    multiplications are necessary and the entire search can be car-
rived in a principled way from phonological rules, the struc-    ried out with additions and comparisons only. Computation
tures of the word model in Fig. 8 and the phone model in Fig.    and storage needs can be reduced by saving for each k, only
9 are fairly arbitrary. Many possible structures seem reason-    those states having relatively large values of Vk(s). This can be
able; the ones shown here are very simple ones which have        achieved by first computing Vk(max) = maxs Vk(s) and then
been used successfully in recognition experiments.               eliminating all states s having Vk(s) < A Vk (max) where A is
                                                                 an appropriately chosen threshold. This makes the search sub-
             V. VITERBI LINGUISTIC DECODING                      optimal, but in practice there is little or no degradation in per-
  In the preceding section we have shown that acoustic sub- formance if the threshold A is chosen with care.
sources can be embedded in phonetic subsources to produce a         This type of search can be used quite successfully on artifi-
model for the acoustic channel. In a similar fashion we can cial tasks such as the Raleigh language task, where the number
embed acoustic channel word models in the Markov source of states is of the order of 1iO.
specifying the language model by replacing each transition by       In addition to its application to suboptimal decoding, the
the model of the corresponding word. The resulting Markov Viterbi algorithm can be used to align an AP output string y
source is a model for the entire stochastic process to the left with a known word string w, by determining the most likely
of the linguistic decoder in Fig. 1. Each complete path t1 path t which produces y when w is uttered. The path t speci-
through the model determines a unique word sequence w= fies a sequence of phones which the algorithm puts into corre-
W(t4) and a unique AP output string yT = Y(tj ) and has the spondence with the symbols forming the sequence y. Inspec-
associated probability P(t1l). Using well known minimum-cost
path-finding algorithms, it is possible to determine for a given   3See Section IV, Notation and Terminology.
 184               IEEE TRANSACTIONS ON PATTERN ANALYSIS AND MACHINE INTELLIGENCE, VOL. PAMI-5, NO. 2, MARCH 1983

 tion of this alignment allows the experimenter to judge the        to control the average rate of growth of A(w) along the most
 adequacy of his models and provides an intuitive check on the      likely path. In practice, a can be chosen by trial and error.
 performance of the AP.                                                An accurate estimate of 2I P(w',y+1 w,y ) is, of course,
                                                                    impossible in practice, but we can approximate it by ignoring
                VI. STACK LINGUISTIC DECODING                       the dependence on w. An estimate of E(yn+ 1 fy ), the average
    In the previous section we presented a decoding procedure value of P(w', yin+ 1 |y), can be obtained from training data.
 which finds the most likely complete path t for a given AP In practice, a Markov-type approximation of the form
 output string y. This decoding method is computationally
feasible only if the state space is fairly small, as is the case in
most artificial tasks. However, in the Laser task (described in
                                                                        E(y)l fHlY1) E(ylj|Yi)
                                                                                        j= i+ 1
                                                                                                                                 (6.3)
Section X), the number of states is of the order of 1011 which can be used. Using k = 1 is usually adequate.
makes the Viterbi search unattractive. Furthermore, the pro-          The likelihood used for incomplete paths during the search
cedure is suboptimal because the word string corresponding to is then given by
the most likely path t may not be the most likely word string.
In this section we present a graph-search decoding method
which attempts to find the most likely word string. This                A(w) = P(w) .PY1|)I Ot i(i+I Y 1     ,
                                                                                                                                 (6.4)
                                                                                      i=o
method can be used with large state spaces.
   Search methods which attempt to find optimal paths through For complete paths, the likelihood is
graphs have been used extensively in information theory [12]            A(w) = P(w) P(yn w),                                     (6.5)
and in artificial intelligence [13]. Since we are interested in
finding the most likely word string, the appropriate graph to i.e., the probability that w was uttered and produced the com-
search is the word graph generated by the language model. plete output stringyn.
When a complete search of the language model graph is com-            The likelihood of a successor path wk = Wk- Wk can be
putationally impractical, some heuristic must be used for re- computed incrementally from the likelihood of its immediate
ducing the computation. Here we describe one specific heuris- predecessor wk- . The a priori probability P(wk) is easily ob-
tic method that has been used successfully. To reduce the tained from the language model using the recursion
amount of computation, a left-to-right search starting at the           p(Wk)    p(Wk1 -') P(Wk lWk-1).
initial state and exploring successively longer paths can be car-            1
                                                                              =
                                                                                                    1                            (6.6)
ried out. To carry out this kind of search we need to define a The acoustic match values P(y1 wk) can be computed incre-
likelihood function which allows us to compare incomplete mentally if the values P(y |Wk -') have been saved [ 14].
paths of varying length. An obvious choice may seem to be              A search based on this likelihood function is easily imple-
the probability of uttering the (incomplete) sequence w and mented by having a stack in which entries of the form (w,
producing some initial subsequence of the observed string y, A(w)) are stored. The stack, ordered by decreasing values of
i.e.,                                                               A(w), initially contains a single entry corresponding to the ini-
      n          .n                                                 tial state of the language model. The term stack as used here
                                                                    refers  to an ordered list in which entries can be inserted at any
    E: N(W,
     i=O
              y1= P(W) E P(y'i
                          i=o
                                   IW).                       (6.1)
                                                                    position. At each iteration of the search, the top stack entry is
                                                                    examined. If it is an incomplete path, the extensions of this
The first term on the right-hand side is the a priori probability path are evaluated and inserted in the stack. If the top path is
of the word sequence w. The second term, referred to as the a complete path, the search terminates with the path at the
acoustic match, is the sum over i of the probability that w pro- top of the stack being the decoded path.
duces an initial substringyi of the AP output stringy. Unfor-          Since the search is not exhaustive, it is possible that the de-
tunately, the value of (6.1) will decrease with lengthening coded sentence is not the most likely one. A poorly articu-
word sequences w, making it unsuitable for comparing incom- lated word resulting in a poor acoustic match, or the occur-
plete paths of different lengths. Some form of normalization rence of a word with low a priori probability can cause the
to account for different path lengths is needed. As in the local likelihood of the most likely path to fall, which may then
Fano metric used for sequential decoding [12], it is advanta- result in the path being prematurely abandoned. In particular,
geous to have a likelihood function which increases slowly short function words like the, a, and of, are often poorly ar-
along the most likely path, and decreases along other paths. ticulated, causing the likelihood to fall. At each iteration, all
This can be accomplished by a likelihood function of the form paths having likelihood within a threshold A of the maximum
              n                                                     likelihood path in the stack are extended. The probability of
    A(w) = E P(w, y i )aOn-i Ep(w', y n+                       62 prematurely abandoning the most likely path depends strongly
             i=0
                                                                    on the choice of A which controls the width of the search.
                               W




If we consider P(w,y ) to be the cost associated with account- Smaller values of A will decrease the amount of search at the
ing for the initial part of the AP string y' by the word string expense of having a higher probability of not finding the most
w, then . P(w', y+ l I w, yA) represents the expected cost of likely path. In practice, A can be adjusted by trial and error to
accounting for the remainder of the AP stringyn+ 1 with some give a satisfactory balance between recognition accuracy and
continuation w' of w. The normalizing factor a can be varied computation time. More complicated likelihood functions and
   BAHL et al.: CONTINUOUS SPEECH RECOGNITION                                                                                                     185

  extension strategies have also been used but they are beyond               where
  the scope of this paper.
                                                                                 'y(t, s, a) = qL(t)(t) 6(R(t), s) 6(A(t), a).                  (7.5)
      VII. AUTOMATIC ESTIMATION OF MARKOV SOURCE                             As with the Viterbi algorithm described in Section V, the ab-
                   PARAMETERS FROM DATA                                      sence of null circuits guarantees that the states can be ordered
    Let Pi(t, b7) be the joint probability that b7 is observed at            so that    ci(si)
                                                                             cxi(sk), k < .
                                                                                             may be determined from cxi- (s), sEGS, and
  the output of a filtered Markov source and that the ith output
  bi spanst.3                                                                  The probabilities,i(s) satisfy the equations
    The count                                                                   13m(SF) = 1                                                   (7.6a)
                        m
     c(t, bm ) A                Pi(t, b1m)P(bm )                    (7.1)            Pi3(s) = E g3(R(t)) t(t, s, 4)
                        i=l
   is the Bayes a posteriori estimate of the number of times that                                 + E Pi+ 1 (R(t)) t(t, s, bi)    i.m,s/:sF (7.6b)
  the transition t is used when the string b7 is produced. If the                                    t
  counts are normalized so that the total count for transitions where am + 1(S) = 0 and
  from a given state is 1, then it is reasonable to expect that the
  resulting relative frequency                                                      t(t, s, a) = qL(t)(t) a5(L(t), s) 6(A(t), a).               (7.7)
                                                                                  Step 3) of the iterative procedure above then consists of
      fS(t, b7) _ Ec(t, bm) 6(s, L(t))                                  (7.2)
                                                                               computing axs in a forward pass over the data, ,Bi in a backward
                     t'                                                        pass over the data, and finally Pi(t, b7) from (7.3). We refer
 will approach the transition probability qs(t) as m increases.               to   the iterative procedure together with the method described
    This suggests the following iterative procedure for obtaining             for   computing Pi(t, b7) as the Forward-Backward Algorithm.
 estimates of qs(t).                                                             The    probability, P(b7), of the observed sequence b7 is a
    1) Make initial guesses qS(t).                                            function      of the probabilities q,(t). To display this dependence
   2) Set j = O.                                                              explicitly,     we write P(b7, q,(t)). Baum [ 1 6] has proven that
   3) Compute Pi(t, b7) for all i and t based on qs(t).                       P(b     , 5     1(t)) q P(b7, q1(t)) with equality only if ql(t) is a
   4) Compute fs(t, b7) and obtain new estimates q +I (t)-                    stationary      point (extremum or inflexion point) of P(bm, ).
                                                                              This result also holds if the transition distributions of some of
fs(t, bm).                                                                    the states are known and hence held fixed or if some of the
   5) Set j = j + 1.
   6) Repeat from 3.                                                          states are tied4 to one another thereby reducing the number of
   To apply this procedure, we need a simple method for com-                  independent        transition distributions.
puting Pi(t, bn). Now Pi(t, bm) is just the probability that a                  When       applied   to a Markov source language model based on
string of transitions ending in L(t) will produce the observed                N-grams       as  described   in Section IV the Forward-Backward
sequence b1-,, times the probability that t will be taken once                Algorithm        reduces   simply  to counting the number of times
                                                                              K(wf    wN    - 1), that w' follows the sequence wN - 1, and setting
L(t) is reached, times the probability that a string of transi-
tions starting with R(t) will produce the remainder of the ob-
served sequence. If A(t) = 4, then the remainder of the ob-                                            1K(wIwi )
served sequence is bM, if A(t) 4) then, of course, A(t) = bi
                                           =
                                                                                Wq                   w
                                                                                                                                               (7.8)
and the remainder of the observed sequence is bM1. Thus if
ai(s) denotes the probability of producing the observed se- This is equivalent to maximum likelihood estimation of the
quence b' by a sequence of transitions ending in the state s, transition probabilities.
and f3i(s) denotes the probability of producing the observed                    When applied to a Markov source model for the acoustic
sequence bm by a string of transitions starting from the state                channel,      the Forward-Backward Algorithm is more interesting.
s, then                                                                       Let    us   first consider the word-based channel model indicated
                                                                              in Fig. 8. A known text wl is read by the speaker and pro-
                                                               if A(t) =      cessed by the acoustic processor to produce an output string
     Pi(t, b7) {i- (L(t)) qL(t)(t) Oi3(R(t))
                                1

                                                                                7. The Markov source corresponding to the text is con-
                    =



                       °ci - I (L(t)) qL(t)(t) Oi+ 1 (R (t't)) if A(t)=bi.    y
                                                                              structed from the subsources for the words with the assump-
                                                                              tion that states of the source which arise from the same sub-
The probabilities ai(s) satisfy the equation [15]                             source state are tied. The Forward-Backward Algorithm then
                                                                              is used to estimate the transition probabilities of the sub-
      ai0(s) = E(s, SI) Ea0(L(t)) y(t, s, 4)
                            +
                                                                              sources from the output string ym . To obtain reliable esti-
                                    t
                                                                              mates of the subsource transition probabilities, it is necessary
                                                                              that each word in the vocabulary occur sufficiently often in
                t

                                                                              4For definition of tying, see Section IV, Notation and Terminology.
            +
                    Eai(L (t))Y(t, s, ))           i   >1I                  For details of the Forward-Backward Algorithm extended to machines
                                                                            with tied states, see [151.
186               IEEE TRANSACTIONS ON PATTERN ANALYSIS AND MACHINE INTELLIGENCE, VOL. PAMI-5, NO. 2, MARCH 1983

                                                                                                                                                         A
the text w'. For large vocabularies this may require an                                                                                                )SI
bitant amount of reading.                                                                             ) SI
  The use of the phone-based model shown in Fig. H
overcome this problem. The Markov source for the t
constructed from phonetic and acoustic subsources a                    S                               S2
                                                                                                                                                         A
                                                                                                                                                         S2
scribed in Section IV. States in the source arising fror
same acoustic subsource state are assumed to be tied. In
tion, states from different phonetic subsources are assum
be tied if transitions leaving the states result from the                                                                                                A

phonological rules. With these assumptions the training                                                S3                                                53
can be considerably shorter since it need only include suffi-                      (a)                                                   (b)
ciently many instances of each phone and each phonetic rrule.         Fig. 12. (a) Part of transition structure of a Markov source. (b) The
                                                                          corresponding part of an associated interpolated Markov source.
             VIII. PARAMETER ESTIMATION FROM
                       INSUFFICIENT DATA                                 The interpretation of (8.1) as an associated Markov source
  It is often the case in practice that the data available aire in-   immediately suggests that the parameters X, be determined by
sufficient for a reliable determination of all of the paranneters     the Forward-Backward (FB) Algorithm. However, since the
of a Markov model. For example, the trigram model fc)r the            X parameters were introduced to predict as yet unseen data,
Laser Patent Text corpus [18] used at IBM Research is Ibased          rather than to account for the training data b', the FB Algo-
on 1.5 million words. Trigrams which do not occur a:mong              rithm must be modified. We wish to extract the X values from
these 1.5 million words are assigned zero probability by :maxi-       data that was not used to determine the distributions q,(t) and
mum likelihood estimation, a degenerate case of the For+ ward-         *q,(t) [see (8.1)]. Since presumably we have only bl at our
Backward Algorithm. Even though each of these trigra 1ms is           disposal, we will proceed by the deleted interpolation method.
very improbable, there are so many of them that they c onsti-         We shall divide bT into n blocks and for i = 1,        , n estimate
tute 23 percent of the trigrams present in new samples of text.       X from the ith block while using qs(t) and *qs(t) estimates de-
In other words, after looking at 1.5 million trigrams the prob-       rived from the remaining blocks.
ability that the next one seen will never have been seen b efore         Since the Xs values should depend on the reliability of the
is roughly 0.23. The Forward-Backward Algorithm prc)vides             estimate qs(t), it is natural to associate them with the esti-
an adequate probabilistic characterization of the training 3data      mated relative frequency of occurrence of the state s. We thus
but the characterization may be poor for new data. A m(ethod          decide on k relative frequency ranges and aim to determine
for handling this problem, presented in detail in [15], iis dis-      corresponding values X(1), * *, X(k). Then Xs = X(i) if the
                                                                                                                          -




cussed in this section.                                               relative frequency of s was estimated to fall within the ith
  Consider a Markov source model the parameters of whi(ch are         range.
to be estimated from data b . We assume that bj is in suffi-             We partition the state space S into subsets of tied states El,
cient for the reliable estimation of all of the parameters.             2,    S* and determine the transition correspondence
   Let qs(t) be forward-backward estimates of the tran       S1itin   functions Ts,s, for all pairs of tied states s, s'. We recall from
probabilities based on b' and let *qs(t) be the correspo     tnding   Section IV that then *qs(t) = *qs,(Ts, s(t)) for all pairs s, s' E
estimates obtained when certain of the states are assum to
be tied. Where the estimates q's(t) are unreliable, we vvould
                                                             led      Si, i 1, * * * ,r. If L(t)E Si, then T(t)= {t'|t'=                         TL(t),s'(t),
                                                                      s' eS} is the set of transitions that are tied to t. Since
like to fall back to the more reliably estimated *qL'S(t) ), but      TL(t),L(t)(t) = t, then t E %f(t).
where q4s(t) is reliable we would like to use it directly.               We divide the data bl into n blocks of length l(m = nl). We
   A convenient way to achieve this is to choose as fina 1 esti-      run the FB Algorithm in the ordinary way, but on the last
mates of qs(t) a linear combination of qs(t) and *q's(t). Thus        iteration we establish separate counters
we let qs(t) be given by
                                                                                          (j - 1) l                              m
   qs(t) = Xsc"(t) + (1 - XS) *'(t)                          (8.1)         cj(t, bm)-A                P,(t,bm )+                 E   Pi(t,=bm)
with Xs chosen close to I when qs(t) is reliable and clc
0 when it is not.                                                                         j= 1,2,-           -   -
                                                                                                                      n                                (8.2)
  Fig. 12(a) shows the part of the transition structure               for each deleted block of data. The above values will give rise
Markov source related to the state s. Equation (8.1) can              to detailed distributions
terpreted in terms of the associated Markov source sho
Fig. 12(b), in which each state is replaced by three stat
Fig. 12(b), s^ corresponds directly to s in Fig. 12(a). Th
                                                                           qs(t, )s1
                                                                                  =  c,(t, b im) 6(s, L(t))
                                                                                     ,tI,bm ) (s,L(t))                                                 (8.3)
transitions from s to s and s* have transition probab                               It'
equal to Xs and 1 - Xs, respectively. The transitions ou              and to tied distributions
have probabilities qa(t) = a^5(t) while those out of s* have
abilities *q,(t) = *qs(t). The structure of the associated                             b(s,L(t)) E ci (tI, bm)
kov source is completely determined by the structure c                                          ~~~~~~t'e
                                                                                                    E J(t)
                                                                                                                                                        (8.4)
original Markov source and by the tyings assumed for ol                    *q3(t) = ,6(s, L(t')) E c(t", bm) -
ing more reliable parameter estimates.                                               tI                              t" E (t')
 BAHI1 et al.: CONTINUOUS SPEECH RECOGNITION                                                                                                                         1 87


 Note that q,(t, j) and *q,(t, j) do not depend directly on
 the output data belonging to the jth block. Thus the data                                                                     /pSw/+l(w/lI(wlw2))
 in the jth block can be considered new in relation to these
probabilities.
   We now run the FB Algorithm on data b7l to determine the
                                                                                                                    ,,,,
                                                                                                                           /
                                                                                                                                             =       ,2(w 1W2))
X values based on n associated Markov sources which have                                                       N\                                P(W i3(Wgw2))
fixed distributions over transitions leaving the states s and s*.
These X values are obtained from estimates of probabilities of                                                                   ,   p (w / 4( w1 ,w2))
transitions leaving the states s of the associated Markov source
[see Fig. 12(b)] . Only k counter pairs pertaining to the values                              Fig. 13. A section of the interpolated trigram language model cor-
                                                                                                    responding to the state determined by the word pair w1, w2.
X(i) and I - X(i) being estimated are established. When run-
ning on the data of the jth block, the jth associated Markov
source is used based on the probabilities q,(t, j) and *qs(t, j).                             are described in [15] . In particular, it is possible to have v dif-
The values Xs used in the jth block are chosen by computing                                   ferent tying partitions of the state space corresponding to
the frequency estimates                                                                       transition distributions (i)qs(t), i = 1, * * , v, and to obtain the
                           c,c(t, b' ) 5 (s, L (t))
                                                                                              final estimates by the formula

  q(s,j) =                                    bm)                                    (8.5)       qs(t) = E Xi(S) (I)qs(t)                                          (8.9)
                              t'                                                                         i=l

and setting Xs = X(i) if q(s, j) belonged to the ith frequency with Xi(s) values determined by the Forward-Backward
range. Also, the Xs counts estimated from the jth block are Algorithm.
then added to the contents of the ith counter pair.                We illustrate this deleted interpolation algorithm with an ap-
  After X values have been computed, new test data is predicted plication to the trigram language model for the laser patent
using an associated Markov source based on probabilities        text corpus used at IBM.
                                                                  Let 7r(w) be the syntactic part of speech (e.g., noun, verb,
                          n
              t(s, L         cj(t, bm)                          etc.) assigned to the word w. Let Oi, i = 1,      , 4 be functions
                                                                classifying the language model states wl w2 as follows:
    qs(t) =                              i= 1n                                       (8.6)
                    ,: d (s, L (t' ))Ect',
                                        ( bml)   ci                                              41 (W1 W2) = {(WI W2)}
                           t'
                                                                                                  k2 (W 1 W2) = {(WW2)1r(w) = r(w1)}
                           5 (s, L (t))       E
                                                      n
                                                      , (t', bm )
                                                                                                 03(WI W2) = {(WW')j17(W) = 7(W1), 7r(W') = 7r(W2)}
                                          t'c T(t) /=I                                            4 (WI W2) = {all pairs of words}.                 (8.10)
   *qs(t)   =
                                                                                     (8.7)
                                     (t')) t"                       bm )
                                                               It

                          L 6(S
                     £ t~~~~~~                            E   jt,                             Let K(Oj(w1 w2)) be the number of times that members of the
                     t'I                        cJ(t') j=l                                    set Oi(w1 w2) occur in the training text. Finally, partition the
and X, values chosen from the derived set X(1),                        -   -

                                                                               *, X(k), de-   state space into sets
pending on the range within which the estimate
                                                                                                   )5 (W1 W2 ) = {ww'| K(Qk1(ww')) = K(Oj (wiW2 3) = 1
                                          n                                                                     j =1, 2,- - - ,i- 1,
                    , 6(s, L() , iQj, bm
  q(s)          t                  1=1                                               (8.8)
                                                                                                 K(o/(ww')) = K(oi (w1w2))> 1}                                    (8.11)
                               EEc,(tl,bm)                                                    which will be used to tie the associated states wl w2 accord-
                            t'     j=1                                                        ing to the frequency of word pair occurrence. Note that if
                                                                                              K(Q I(w1w2)) > 2, then 05(wI w2) is simply the set of all word
falls. It might appear that the convergence of the estimation                                 pairs that occurred in the corpus exactly as many times as
of the interpolation weights X(i) needs proving since it involves                             wIw2 did. A different X distribution will correspond to each
the use of different fixed distributions q(s, j) over different                               different set (8.11). The language model transition probabili-
blocks j = 1,     , n. However, some thought will reveal that                                 ties are given by the formula
the problem can be reformulated in terms of a single move
complex Markov source, some of whose parameters are tied                               4
and others fixed. This source is identical to the trellis that is    P(w3lwlW2) = 1=1                                           Xi(ks(w1W2))Pi(W3j1i(WIW2)).
needed to carry out the X estimation. The process consists of
carrying out the Forward-Backward Algorithms for estimating                                                                (8.12)
the parameters of the complex Markov source, and thus con-
verges by the Baum theorem [16].                                  Fig. 13 illustrates this graphically. We use deleted interpola-
  This approach to modeling data generation is called deleted tion also in estimating the probabilities associated with the
interpolation. Several variations are possible some of which acoustic channel model.
188               IEEE TRANSACTIONS ON PATTERN ANALYSIS AND MACHINE INTELLIGENCE, VOL. PAMI-5, NO. 2, MARCH 1983

        IX. A MEASURE OF DIFFICULTY FOR FINITE                     ering the sentences of the task to be strings of phonemes rather
                  STATE RECOGNITION TASKS                          than strings of words. We can then compute the phoneme
  Research in continuous speech recognition has led to the de-     level perplexity of the two tasks and normalize them to words
velopment of a number of artificial tasks. In order to compare     of equal length. In this way the perplexity of the task with
the performance of different systems on sentences from differ-     the greater average word length will be lowered relative to that
ent tasks, it is necessary to have a measure of the intrinsic dif- of the other task.
ficulty of a task. Although vocabulary size is almost always          Some pairs of phonemes are more confusable than others. It
mentioned in the description of an artificial task, by itself it isis possible therefore to have two tasks with the same phoneme
practically useless as a measure of difficulty. In this section    level perplexity, one of which is much easier to recognize than
we describe perplexity, a measure of difficulty based on well      the other, simply because its words are acoustically farther
established information theoretic principles. The experimental      apart. We can take this into account by considering the joint
results described in the next section show a clear correlation     probability distribution P(w, y) of word sequences w and
between increasing perplexity and increasing error rate.            acoustic sequences y and determining from it the conditional
  Perplexity is defined in terms of the information theoretic      entropy H(w|y). y could be the output string from a particu-
concept of entropy. The tasks used in speech recognition           lar acoustic processor or simply the time waveform itself. Un-
can be adequately modeled as unifilar3 Markov sources. Let         fortunately, this is far too difficult to compute in practice.
P(wJs) be the probability that word w will be produced next           Perplexity reflects the difficulty of recognition when a com-
when the current state is s. The entropy, H,(w) associated         plete search can be performed. The effect on the error rate of
with state s is                                                    performing an incomplete search may be more severe for one
                                                                   language than for another, even though they have the same
                      IS)
   Hs(w) = - P(w Iog, P(w          IS).                      (9.1) perplexity. However, as the results in the next section show,
               w
                                                                   there is a clear correlation between perplexity and error rate.
The entropy H(w) of the task is simply the average value of
                                                                                     X. EXPERIMENTAL RESULTS
Hs(w). Thus if ir(s) is the probability of being in state s during
the production of a sentence, then                                    The results given in this section, obtained before 1980, are
                                                                   described in detail in [3], [51, [6], [18], [19].
   H(w) - i(s) Hs(w).                                        (9.2)    Table I shows the effect of training set size of recognition
             s
                                                                   error rate. 200 sentences from the Raleigh Language (100
  The perplexity S(w) of the task is given in terms of its en- training and 100 test) were recognized using a segmenting
tropy H(w) by                                                      acoustic processor and a stack algorithm decoder. We initially
   S(w) = 2 H(W)                                             (9.3) estimated the acoustic channel model parameters by examining
                                                                   samples of acoustic processor output. These parameter values
  Often, artificially constrained tasks specify the sentences were then refined by applying the Forward-Backward Algo-
possible without attaching probabilities to them. Although rithm to training sets of increasing size. While for small train-
the task perplexity depends on the probabilities assigned to ing set sizes performance on training sentences should be
the sentences, Shannon [17] has shown that the maximum en- substantially better than on test sentences, for sufficiently large
tropy achievable for a task with N possible sentences of aver- training set sizes performance on training and text sentences
age length 1 is 1/1 10g2 N. Hence the maximum perplexity is should be about equal. By this criterion a training set size of
Nl/l. If all the sentences for the task could be arranged as a 600 sentences is adequate for determining the parameters of
regular tree, the number of branches emanating from a node this acoustic channel model. Notice that even a training set
would be N'll. So, for artificially constrained tasks, perplex- size as small as 200 sentences leads to a substantial reduction
ity can be thought of as the average number of alternative in error rate as compared to decoding with the initially esti-
words at each point. For the Raleigh task of Fig. 7, the num- mated channel model parameters.
ber of alternative words ranges from 1 to 24, and the perplex-        The power of automatic training is evident from Table I in
ity is 7.27.                                                       the dramatic decrease in error rate resulting from training even
  For natural language tasks, some sentences are much more with a small amount of data. The results in Table II further
probable than others and so the maximum perplexity is not demonstrate the power of automatic training. Here, three
useful as a measure of difficulty. However, the perplexity, versions of the acoustic channel model are used, each weaker
which can be computed from the probabilities of the sentences, than the previous one. The "complete acoustic channel model"
remains a useful measure. Information theory shows that for a result corresponds to the last line of Table I. The acoustic
language with entropy H, we can ignore all but the most prob- channel model in this case is built up from phonetic subsources
able 2lH strings of length 1 and still achieve any prescribed er- and acoustic subsources as described in Section IV. The pho-
ror rate.                                                          netic subsources produce many different strings for each word
  The definition of perplexity makes no use of the phonetic reflecting phonological modifications due to rate of articulation,
character of the words in the vocabulary of the language. Two dialect, etc. The "single pronunciation" result is obtained with
tasks may have the same perplexity but one may have words an acoustic channel model in which the phonetic subsources
that are substantially longer than the other, thereby making allow only a single pronunciation for each word. Finally, the
recognition easier. This problem can be overcome by consid- "spelling-based pronunciation" result is obtained with an
BAHL et al.: CONTINUOUS SPEECH RECOGNITION                                                                                               189

                                                                TABLE I
                                               EFFECT OF TRAINING SET SIZE ON ERROR RATE
                                                                             % of Sentences
                                                                           Decoded Incorrectly
                                        Training Set
                                            Size                    Test                   Training

                                              0                     80%                          -
                                            200                     23%                       12%
                                            400                     20%                       13%
                                            600                     15%                       16%
                                            800                     18%                       16%
                                           1070                     17%                       14%


                                                                                                  TABLE III
                          TABLE II                                             DECODING RESULTS FOR SEVERAL DIFFERENT ACOUSTIC
          EFFECT OF WEAK ACOUSTICS CHANNEL MODELS                                   PROCESSORS WITH THE RALEIGH LANGUAGE

                                             % of Sentences                                                          Error Rate
              Model Type                   Decoded Incorrectly                                                                    Word
                                                                               Acoustic Processor            Sentence
    Complete Acoustic Channel Model                 17%
    Single Pronounciation                           25%                             MAP                        27%                3.6%
    Spelling-Based Pronounciation                   57%                             CSAP                        2%                0.2%
                                                                                    TRIVIAL                     2%                0.2%


                                                              TABLE IV
                                      RECOGNITION RESULTS FOR SEVERAL TASKS OF VARYING PERPLEXITY

                                            Vocabulary                             Word Error Rate

                                Task              Size    Perplexity Segmenting AP Time-Synchronous AP
                            CMU-AIX05             1011       4.53           0.8%                     0.1%
                            Raleigh                250       7.27           3.1%                     0.6%o
                            Laser                 1000      24.13          33.1%                     8.9%


acoustic channel model in which the single pronunciation             processor on three tasks of varying perplexity. The Raleigh
allowed by the phonetic subsources is based directly on the          task has been described earlier in the paper. The Laser task is
letter-by-letter spelling of the word. This leads to absurd          a natural language task used at IBM. It consists of sentences
pronunciation models for some of the words. For example,             from the text of patents in laser technology. To limit the
through is modeled as if the final g and h were pronounced.          vocabulary, only sentences made entirely from the 1000 most
The trained parameters for the acoustic channel with spelling-       frequent words in the complete laser corpus are considered.
based pronunciations show that letters are often deleted by          The CMU-AIX05 task [20] is the task used by Carnegie-Mellon
the acoustic processor reflecting the large number of silent         University in their Speech Understanding System to meet the
letters in English spelling. Although the results obtained in        ARPA specifications [211. All these results were obtained
this way are much worse than those obtained with the other           with sentences spoken by a single talker in a sound-treated
two channel models, they are still considerably better than          room. Approximately 1000 sentences were used for estimating
the results obtained with the complete channel model using           the parameters of the acoustic channel model in each of the
parameters estimated by people.                                      experiments. There is a clear correlation between perplexity
  Table III shows results on the Raleigh Language for several        and error rate. The CMU-AIXO5 task has the largest vocabu-
different acoustic processors. In each case the same set of          lary but the smallest perplexity. Note that for each of the
100 sentences was decoded using the stack decoding algorithm.        tasks, the performance of the time-synchronous acoustic
MAP is a segmenting acoustic processor, while CSAP and               processor is considerably better than that of the segmenting
TRIVIAL are nonsegmenting acoustic processors. Prototypes            acoustic processor.
for CSAP were selected by hand from an examination of
speech data. Those for TRIVIAL were obtained automatically                               ACKNOWLEDGMENT
from a Viterbi alignment of about one hour of speech data.             We would like to acknowledge the contributions of the
  Table IV summarizes the performance of the stack decoding          following present and past members of the Continuous Speech
algorithm with a segmenting and a time-synchronous acoustic          Recognition Group at the IBM Thomas J. Watson Research
190                  IEEE TRANSACTIONS ON PATTERN ANALYSIS AND MACHINE INTELLIGENCE, VOL. PAMI-5, NO. 2, MARCH 1983


Center: J. K. Baker, J. M. Baker, R. Bakis, P. Cohen, A. Cole,                 [20] D. R. Reddy et al., "Speech understanding systems final report,"
R. Dixon, B. Lewis, E. Muckstein, and H. Silverman.                                 Dep. Comput. Sci., Carnegie-Mellon Univ., 1977.
                                                                               [21] A. Newell, J. Barnett, J. W. Forgie, C. Green, D. Klatt, J. C. R.
                                                                                    Licklider, J. Munson, D. R. Reddy, and W. A. Woods, Speech
                              REFERENCES                                            Understanding Systems: Final Report of a Study Group. Am-
 [1] R. Bakis, "Continuous speech recognition via centisecond acoustic              sterdam, The Netherlands: North-Holland, 1973.
     states," presented at the 91st Meeting Acoust. Soc. Amer., Wash-
     ington, DC, Apr. 1976; also IBM Res. Rep. RC-5971, IBM Res.
      Center, Yorktown Heights, NY, Apr. 1976.
  [2] B. T. Lowerre, "The Harpy speech recognition system," Ph.D.                                            Lalit R. Bahl (S'66-M'68) received the B.Tech.
      dissertation, Dep. Comput. Sci., Carnegie-Mellon Univ., Pitts-                                         (Hons.) degree from the Indian Institute of
      burgh, PA, 1976.                                                                                       Technology, Kharagpur, India, in 1964 and the
  [3] L. R. Bahl, R. Bakis, P. S. Cohen, A. G. Cole, F. Jelinek, B. L.                                      M.S. and Ph.D. degrees in electrical engineer-
      Lewis, and R. L. Mercer, "Recognition results with several acous-                                     ing from the University of Illinois, Urbana,
      tic processors," in Proc. IEEE Int. Conf. Acoust., Speech, Signal                                     in  1966 and 1968, respectively.
      Processing, Washington, DC, Apr. 1979, pp. 249-251.                                                      Since  1968 he has been at the IBM Thomas J.
  [4] J. M. Baker, "Performance statistics of the hear acoustic proces- ~, <j                      v        sWatson Research Center in Yorktown Heights,
      sor," in Proc. IEEE Int. Conf. Acoust., Speech, Signal Processing,                                    NY. Since 1979 he has been Manager of the
      Washington, DC, Apr. 1979, pp. 262-265.                                                                Natural Language Speech Recognition Group.
  [5] L.  R. Bahl,  J. K.  Baker,  P. S. Cohen,   N. R.  Dixon, F.  Jelinek,                                 During 1969-1974 he was also Adjunct Associ-
       R. L. Mercer, and H. F. Silverman, "Preliminary results on the
      performance of a system for the automatic recognition of con- ate                Professor in the Department of Electrical Engineering and Computer
      tinuous speech," in Proc. IEEE Int. Conf. Acoust., Speech, Signal include    Science, Columbia University, New York, NY. His research interests
      Processing, Philadelphia, PA, Apr. 1976, pp. 425-429.                                 speech recognition, information theory, coding theory, and
 [6] L. R. Bahl, J. K. Baker, P. S. Cohen, A. G. Cole, F. Jelinek, B. L.           communication    theory.
      Lewis, and R. L. Mercer, "Automatic recognition of continuously
      spoken sentences from a finite state grammar," in Proc. IEEE Int.
      Conf Acoust., Speech, Signal Processing, Tulsa, OK, Apr. 1978,
      pp. 418-421.                                                  ................. f000-0"00
                                                                                              i0-i          Frederick Jelinek (S'55-M'62-SM'69-F'74)
 [7] J. Lyons, Introduction to Theoretical Linguistics. Cambridge,                                          was born in Prague, Czechoslovakia, on Novem-
      England: Cambridge Univ. Press, 1969.                                                                 ber 18, 1932. He received the S.B., S.M., and
 [8] P. S. Cohen and R. L. Mercer, "The phonological component of                                       -Ph.D. degrees in electrical engineering from the
      an automatic speech-recognition system," in Speech Recognition,                                       Massachusetts Institute of Technology, Cam-
      D. R. Reddy, Ed. New York: Academic, 1975, pp. 275-320.                                               bridge,  in 1956, 1958, and 1962, respectively.
 [9] J. K. Baker, "The DRAGON system-An overview," IEEE Trans.                                                 Since June 1972 he has been with the Com-
      Acoust., Speech, Signal Processing, vol. ASSP-23, pp. 24-29,                                          puter Sciences Department, IBM Thomas J.
      Feb. 1975.                                                                                            Watson Research Center, Yorktown Heights,
[101 R. E. Bellman, Dynamic Programming. Princeton, NJ: Princeton                                           NY, where he manages research on automatic
      Univ. Press, 1957.                                                                                    recognition (transcription) of speech. He has
[111 G. D. Forney, Jr., "The Viterbi algorithm," Proc. IEEE, vol. 61, been an Instructor at M.I.T. (1959-1962), a Visiting Lecturer at Harvard
      pp. 268-278, Mar. 1973.                                                      University (1962), a Professor of Electrical Engineering at Cornell
[12] F. Jelinek, "A fast sequential decoding algorithm using a stack," University (1962-1974), a Visiting Scientist at M.I.T. Lincoln Labora-
      IBM J. Res. Develop., vol. 13, pp. 675-685, Nov. 1969.                             (1964-1965), and a Visiting Scientist at IBM Thomas J. Watson
[13] N. J. Nilsson, Problem-Solving Methods in Artificial Intelligence. tory       Research Center (1968-1969). His principal interests are in speech
      New York: McGraw-Hill, 1971.                                                recognition and information theory. His is the author of Probabilistic
[141 L. R. Bahl and F. Jelinek, "Decoding for channels with insertions, Information Theory (New York: McGraw-Hill, 1968).
      deletions, and substitutions with applications to speech recogni-              Dr. Jelinek was the President of the IEEE Group on Information
      tion," IEEE Trans. Inform. Theory, vol. IT-21, pp. 404-411, Theory in 1977 and was the recipient of the 1969-1970 Information
      July 1975.                                                                  Theory Group Prize Paper Award.
[15] F. Jelinek and R. L. Mercer, "Interpolated estimation of Markov
      source parameters from sparse data," in Proc. Workshop Pattern
      Recognition in Practice, May 21-23, 1980. Amsterdam, The
      Netherlands: North-Holland.
[16] L. E. Baum, "An inequality and associated maximization tech-                                           Robert L. Mercer was born in San Jose, CA, on
      nique in statistical estimation of probabilistic functions of Markov                               0July 11, 1946. He received the B.S. degree in
      processes," Inequalities, vol. 3, pp. 1-8, 1972.                              .......--...._          physics and mathematics from the University of
[17] C. E. Shannon, "Prediction and entropy of printed English," Bell                                       New Mexico, Albuquerque, in 1968 and the
      Syst. Tech. J., vol. 30, pp. 50-64, 1951.                                                             M.S. and Ph.D. degrees in computer science
[18] L. R. Bahl, J. K. Baker, P. S. Cohen, F. Jelinek, B. L. Lewis, and                                     from the University of Illinois, Urbana, in 1970
      R. L. Mercer, "Recognition of a continuously read natural cor-                                        and 1972, respectively.
      pus," in Proc. IEEE Int. Conf. Acoust., Speech, Signal Processing,                                       Since 1972 he has been a Research Staff
      Tulsa, OK, Apr. 1978, pp. 422-424.                                                                    member, Computer Sciences Department, and
[19] L. R. Bahl, R. Bakis, P. S. Cohen, A. G. Cole, F. Jelinek, B. L.                                       is currently Manager of Real-Time Speech
      Lewis, and R. L. Mercer, "Further results on the recognition of                                       Recognition at the IBM Thomas J. Watson Re-
      a continuously read natural corpus," in Proc. IEEE Int. Confi search Center, Yorktown Heights, NY.
      Acoust., Speech, Signal Processing, Denver, CO, Apr. 1980, pp.                 Dr. Mercer is a member of Sigma Xi, Phi Beta Kappa, and Phi Kappa
      872-875.                                                                    Phi.
