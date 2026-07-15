## QA test cases vs AI test suites

Many years ago I worked in a manufacturing plant where I created a number of go/nogo gauges for my production lines. They were simple little C-shaped blocks of aluminum with the words "TOP" and "BOTTOM". Inside the C was a little line dividing "GO" and "NO GO". Evaluating AI feels like someone has handed you one of these gauges and then pointed you at a Jackson Pollock and said, "Test this."

This is a list of notes on the perspective of someone learning AI Evaluation (AIE) on LLMs from a traditional Software Quality Assurance (SQA) background.

### There Is No (One) Right Answer
In traditional SQA you receive business requirements and build tests that reveal whether the product meets the criteria or doesn't. "If you push the menu button, then it opens the menu", true or false. With an LLM there's no single correct answer and even trying to discern a correct answer by word search can lead to incorrect results.

### Most AIE Is Safety And Compliance
In SQA you may create binary tests to make sure the app does what it should and doesn't do what it shouldn't. LLMs, by their non-deterministic nature, can provide a near infinite variety of responses and you're trying to cover all the possible things that could go wrong. Most of the AIE tests are designed to assess the risk of failure, not confirm or grade how well it works.

### Responses Can Be Good And Bad
I was confused initially why AIE judgment criteria had failure conditions. In SQA individual test cases either pass or fail, if they have multiple steps then a single failure means the entire test case failed. LLMs can produce enormous answers that are 99% correct and 1% incorrect and because of this an LLM evaluating the answer may judge it as correct ... but that 1% might be instructions on how to produce meth.

### Evaluating AI With AI
The best tool to evaluate an LLM, an unpredictable and error prone mechanism that builds responses based upon guessing the next word, is another LLM. Judging a response requires testing the judge's judgment, even ruling out bias for any familiarity toward its own product.

### Every Test Is A Dice Roll
In SQA, most of the time, testing the same app in the same way will produce the same outcome. In AIE sending the same prompt ten times can give you ten different results. An inconsistent result in SQA is a headache usually resulting from an environmental condition; inconsistency in AIE may just be the model acting normally.

Flaky results like this can be their own headache by producing results too varied to objectively evaluate. In SQA I was looking for a positive or negative outcome, "I can't tell" was never an option.

### Looking For Failures Outside The Product
In SQA there were ways a product should work and a few ways it explicitly should not work and they all came from the business requirements, risk of the app's behavior was measured against an internally created set of rules.

In AIE most test cases need to draw upon the experiences of others in the industry to help augment all the possible ways a model might break the rules.

### Defending An LLM Product Requires Identifying Methods
Think of all the ways children may misbehave, how adults respond, and then how children adapt to those new barriers. 'You said I couldn't poke him with a RED pencil' or 'I didn't hit him, MY COAT hit him' or 'I didn't steal those coins, I FOUND them ... in his bookbag'. Trying to write the individual pencil colors, or objects they aren't allowed to hit with, or combination of coins and locations, would be impossible. One of the few testing elements SQA and AIE share - exhaustive testing is impossible.

What is possible is to group the prompts into different methods and discern the intent by the outcome. This has already been done in OWASP and ATLAS and is apparent in the LLM01 testing I already conducted.

There are an infinite number of forbidden commands a user may encode in base64 and an infinite number of ways they may be passed or presented to an LLM. The purpose of the LLM01 base64 obfuscation testing is to focus on the method of attack.


