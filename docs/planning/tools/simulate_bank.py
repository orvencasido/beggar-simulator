"""Optional-bank balance experiment. No changes to the runtime or Supabase."""
import json

from simulate_lifetime import DAYS, Life

DENOMINATOR = 146000


def accrue(balance, remainder=0):
    numerator = min(4 * min(balance, 500000) + max(0, balance - 500000), 20000000)
    credit, remainder = divmod(numerator + remainder, DENOMINATOR)
    return credit, remainder


class BankLife(Life):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bank = 0
        self.interest = 0
        self.remainder = 0

    def buy(self, amount, label):
        if self.money + self.bank < amount + 200:
            return False
        withdrawal = max(0, amount + 200 - self.money)
        self.money += withdrawal
        self.bank -= withdrawal
        return super().buy(amount, label)

    def step(self):
        # Eligible day-opening balance: today's payout is deposited afterward.
        credit, self.remainder = accrue(self.bank, self.remainder)
        self.bank += credit
        self.interest += credit
        super().step()
        if self.earned >= 10000:
            deposit = max(0, self.money - 200)
            self.bank += deposit
            self.money -= deposit

    def run(self):
        while self.day < DAYS:
            self.progression()
            self.step()
        assert sum(self.counts.values()) == DAYS
        assert self.earned + self.interest - self.spent == self.money + self.bank
        assert self.interest <= 82 * 50000
        return {"route": self.route, "begging_reward": self.begging_reward, "days": self.day,
                "gross_work": self.earned, "interest": self.interest, "spent": self.spent,
                "wallet": self.money, "bank": self.bank, "liquid_total": self.money + self.bank,
                "counts": self.counts, "milestone_ages": self.milestones}


if __name__ == "__main__":
    examples = []
    for initial in (100000, 500000, 1000000, 15000000, 20000000):
        balance, remainder = initial, 0
        for _ in range(365):
            credit, remainder = accrue(balance, remainder)
            balance += credit
        examples.append({"initial": initial, "balance_after_365_days": balance,
                         "interest": balance - initial})
    # No balance means no new interest; tier and daily cap use exact integer math.
    assert accrue(0) == (0, 0)
    assert accrue(20000000)[0] == 136
    results = [BankLife(route).run() for route in ("begging", "courier", "technology", "business", "trades")]
    results.append(BankLife("technology", wants=(("first_house", 600000), ("sedan", 180000),
                   ("villa", 4000000), ("luxury_car", 1200000), ("private_jet", 15000000))).run())
    print(json.dumps({"one_year_examples": examples, "lifetime_scenarios": results}, indent=2))
