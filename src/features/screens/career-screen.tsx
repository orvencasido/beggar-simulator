import { useState } from 'react';
import { View } from 'react-native';
import { GameBadge, GameButton, GameChoice, GameDivider, GameScreen, GameSection, GameText } from '@/components/game';
import { gameSpacing } from '@/constants/game-theme';
import { applyAction, getAgeBand, getJobReward, jobUnlocked, type Job } from '@/game-core';
import { useGame } from '@/features/game/game-provider';
import { GameFeedback, GameGate } from './game-gate';
import { canAfford, itemName, jobName, money, qualificationName, SectionHeading, useSafeAction } from './screen-parts';

export function CareerScreen() { return <GameGate><CareerContent /></GameGate>; }
function CareerContent() {
  const game = useGame(), state = game.state!, catalog = game.catalog!;
  const [section, setSection] = useState<'jobs' | 'education' | 'opportunities' | 'care'>('jobs');
  const [details, setDetails] = useState<string | null>(null);
  const [schools, setSchools] = useState<Record<string, string>>({});
  const [abandon, setAbandon] = useState(false);
  const safe = useSafeAction();
  const blocked = game.busy || game.weekRunning || game.syncStatus === 'paused';
  const template = catalog.opportunities.find(o => o.available);
  const checkup = applyAction(state, { type: 'checkup' }, catalog);
  const enrollment = state.education && catalog.qualifications.find(q => q.id === state.education!.qualificationId);
  const jobDetails = (job: Job) => {
    const requiredItems = job.requirements.itemIds.map(id => `${state.ownedItemIds.includes(id) ? '✓' : 'Need'} ${itemName(id, catalog)}`);
    const requiredDegrees = job.requirements.qualificationIds.map(id => `${state.qualifications.includes(id) ? '✓' : 'Need'} ${qualificationName(id, catalog)}`);
    return [...requiredItems, ...requiredDegrees, ...(job.requirements.familyExperienceDays ? [`${state.careerExperience[job.careerId] ?? 0} / ${job.requirements.familyExperienceDays} qualified ${catalog.careers.find(c => c.id === job.careerId)?.name.toLowerCase() ?? 'career'} work days`] : [])];
  };
  return <GameScreen>
    <GameText tone="secondary">A little work. A bigger possibility.</GameText>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gameSpacing.sm }}>{(['jobs', 'education', 'opportunities', 'care'] as const).map(id => <GameButton key={id} title={id === 'opportunities' && state.offer ? 'Opportunities · new' : id[0].toUpperCase() + id.slice(1)} variant={section === id ? 'primary' : 'secondary'} onPress={() => setSection(id)} testID={`career-${id}`} />)}</View>
    <GameFeedback />
    {section === 'jobs' && catalog.careers.map(career => <GameSection key={career.id}>
      <SectionHeading title={career.name} detail={`${state.careerExperience[career.id] ?? 0} qualified experience days`} />
      {catalog.jobs.filter(j => j.careerId === career.id).map(job => {
        const selected = job.id === state.jobId, unlocked = jobUnlocked(state, job);
        return <View key={job.id} style={{ gap: gameSpacing.md }}>
          <GameChoice title={job.name} detail={`${money(getJobReward({ ...state, jobId: job.id }, catalog))} / day · ${selected ? 'Current' : !job.available ? 'Retired' : unlocked ? 'Available' : 'Locked'}`} selected={details === job.id} onPress={() => setDetails(details === job.id ? null : job.id)} testID={`job-details-${job.id}`} />
          {details === job.id && <GameSection style={{ paddingBottom: gameSpacing.lg }}>
            <GameText variant="caption" tone="secondary">Base {money(job.baseEarnings)}{job.maxEarnings !== job.baseEarnings ? `–${money(job.maxEarnings)}` : ''} · −{getAgeBand(state, catalog).basalHunger + job.hungerStrain + (state.health < 4000 ? 1 : 0)} hunger · −{job.sanityCost} sanity · 1 day</GameText>
            {jobDetails(job).map(line => <GameText key={line} variant="caption">{line}</GameText>)}
            {!!job.requirements.qualificationIds.length && <GameText variant="caption" tone="secondary">Experience grows through qualified work in this career. Other careers don’t count toward this promotion.</GameText>}
            <GameButton title={selected ? 'Current job' : unlocked ? `Choose ${job.name}` : 'Requirements not met'} variant="secondary" onPress={() => void game.chooseJob(job.id)} disabled={selected || !unlocked || blocked} testID={`choose-${job.id}`} />
            {!unlocked && !!job.requirements.qualificationIds.length && <GameButton title="Explore education" variant="quiet" onPress={() => setSection('education')} />}
          </GameSection>}
        </View>;
      })}
    </GameSection>)}
    {section === 'education' && <>
      {enrollment && <GameSection variant="accent"><SectionHeading title={enrollment.name} detail={`${state.education!.studyDays} / ${enrollment.studyDays} study days · ${catalog.colleges.find(c => c.id === state.education!.collegeId)?.name}`} /><GameText variant="caption">Study takes 1 day · −{getAgeBand(state, catalog).basalHunger + catalog.economy.studyStrain + (state.health < 4000 ? 1 : 0)} hunger · −{catalog.economy.studySanity} sanity</GameText><GameButton title="Study" disabled={blocked || safe.pending} onPress={() => safe.run({ type: 'study' })} testID="study" /></GameSection>}
      <GameText variant="caption" tone="secondary">One course at a time. Tuition is charged once; graduation comes from study. Qualifications reset next life and remain in your legacy.</GameText>
      {catalog.qualifications.filter(q => q.available).map(q => {
        const tuition = state.scholarshipIds.includes(q.id) ? (BigInt(q.tuition) * 9n / 10n).toString() : q.tuition;
        const selectedSchool = schools[q.id] ?? q.collegeIds.find(id => catalog.colleges.some(c => c.id === id && c.available)) ?? '';
        const graduated = state.qualifications.includes(q.id), enrolled = state.education?.qualificationId === q.id;
        return <GameSection key={q.id}>
          <GameDivider /><SectionHeading title={q.name} detail={`${money(tuition)} tuition · ${q.studyDays} study days`} />
          <GameText variant="caption" tone="secondary">Opens {catalog.jobs.filter(j => j.requirements.qualificationIds.includes(q.id)).map(j => j.name).join(', ') || 'a graduation achievement'}.</GameText>
          {graduated ? <GameBadge tone="accent">Graduated · {catalog.colleges.find(c => c.id === state.qualificationColleges[q.id])?.name ?? 'College'}</GameBadge> : enrolled ? <GameBadge tone="accent">Studying now</GameBadge> : <>
            {q.collegeIds.map(id => catalog.colleges.find(c => c.id === id)).filter(c => c?.available).map(c => <GameChoice key={c!.id} title={c!.name} selected={selectedSchool === c!.id} onPress={() => setSchools({ ...schools, [q.id]: c!.id })} />)}
            <GameButton title={`Enroll · ${money(tuition)}`} disabled={blocked || !!state.education || !canAfford(state, tuition) || !selectedSchool} onPress={() => void game.enroll(q.id, selectedSchool)} testID={`enroll-${q.id}`} />
            {!canAfford(state, tuition) && <GameText variant="caption" tone="secondary">Save for tuition before enrolling.</GameText>}
            <GameButton title={state.scholarshipIds.includes(q.id) ? '10% scholarship earned' : state.elapsedDays < 180 ? 'Scholarship available after day 180' : 'Claim 10% scholarship'} variant="quiet" disabled={blocked || state.elapsedDays < 180 || state.scholarshipIds.includes(q.id)} onPress={() => void game.act({ type: 'scholarship', qualification_id: q.id })} testID={`scholarship-${q.id}`} />
          </>}
        </GameSection>;
      })}
    </>}
    {section === 'opportunities' && <>
      <SectionHeading title="Make your next few days count" detail="Contracts add optional rewards. Their deadlines advance only through game days; bonus income never counts toward career rankings." />
      {state.offer && template && <GameSection variant="accent"><SectionHeading title={`${jobName(state.offer.jobId, catalog)} assignment`} detail={`Offer expires in ${Math.max(0, state.offer.expiresDay - state.elapsedDays)} game days`} /><GameText variant="caption">Complete {template.requiredWorkDays} matching work days within {template.durationDays} days. Bonus: matching earned pay ÷ {template.bonusDivisor}, capped at {money(template.lifeBonusCap)} contract income per life.</GameText><GameButton title="Accept assignment" disabled={blocked || !!state.contract} onPress={() => void game.acceptContract(state.offer!.id)} testID="accept-contract" /><GameButton title="Decline" variant="quiet" disabled={blocked} onPress={() => void game.declineContract(state.offer!.id)} /></GameSection>}
      {state.contract && template && <GameSection><SectionHeading title={`Working on ${jobName(state.contract.jobId, catalog)}`} detail={`${state.contract.completedDays} / ${template.requiredWorkDays} matching days · ${Math.max(0, state.contract.deadlineDay - state.elapsedDays)} days left`} /><GameText variant="caption" tone="secondary">Matching payout so far: {money(state.contract.payoutSum)}. Your selected job must match to advance this assignment.</GameText><GameButton title={abandon ? 'Confirm abandon assignment' : 'Abandon assignment'} variant="quiet" disabled={blocked} onPress={() => { if (abandon) { void game.abandonContract(); setAbandon(false); } else setAbandon(true); }} />{abandon && <GameButton title="Keep assignment" variant="secondary" onPress={() => setAbandon(false)} />}</GameSection>}
      {!state.offer && !state.contract && <GameText tone="secondary">No assignment right now. Opportunities arrive through ordinary days as your career opens up.</GameText>}
    </>}
    {section === 'care' && <GameSection><SectionHeading title={state.health < 2000 ? 'Frail' : state.health < 4000 ? 'Unwell' : 'Feeling well'} detail={`Health ${(state.health / 100).toFixed(0)}% · fictional condition`} /><GameText variant="caption" tone="secondary">Low health reduces earnings and adds hunger strain. Rest helps health; checkups restore up to {(catalog.economy.checkupHealth / 100).toFixed(0)}%, less today’s aging.</GameText><GameButton title={`Checkup · ${money(catalog.economy.checkupPrice)}`} subtitle={`1 day · −${getAgeBand(state, catalog).basalHunger} hunger`} onPress={() => safe.run({ type: 'checkup' })} disabled={blocked || safe.pending || !checkup.accepted} testID="checkup" /></GameSection>}
    {safe.confirmation}
  </GameScreen>;
}
