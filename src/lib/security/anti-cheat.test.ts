import { isSpamTask, isPlausibleCompletion } from './anti-cheat';

describe('Anti-Cheat Utility: isSpamTask', () => {
  it('should flag tasks that are too short', () => {
    expect(isSpamTask('a')).toBe(true);
    expect(isSpamTask('gym')).toBe(true); // < 5 chars
    expect(isSpamTask('read')).toBe(true);
  });

  it('should pass valid short tasks if >= 5 chars', () => {
    expect(isSpamTask('study')).toBe(false);
    expect(isSpamTask('do laundry')).toBe(false);
  });

  it('should flag tasks with repeated characters', () => {
    expect(isSpamTask('aaaaa')).toBe(true);
    expect(isSpamTask('11111')).toBe(true);
    expect(isSpamTask('go to gyyyyym')).toBe(true); // 4 'y's
  });

  it('should pass normal tasks without repetition', () => {
    expect(isSpamTask('Finish homework')).toBe(false);
    expect(isSpamTask('Go to the gym')).toBe(false);
  });
});

describe('Anti-Cheat Utility: isPlausibleCompletion', () => {
  it('should flag completion times that are too fast', () => {
    const now = new Date();
    const threeSecondsLater = new Date(now.getTime() + 3000);
    
    // minDuration is 5 seconds
    expect(isPlausibleCompletion(now, threeSecondsLater)).toBe(false);
  });

  it('should pass completion times that are plausible', () => {
    const now = new Date();
    const tenSecondsLater = new Date(now.getTime() + 10000);
    
    // minDuration is 5 seconds
    expect(isPlausibleCompletion(now, tenSecondsLater)).toBe(true);
  });

  it('should handle custom minimum durations', () => {
    const now = new Date();
    const sixtySecondsLater = new Date(now.getTime() + 60000);
    
    // Custom min duration of 120 seconds
    expect(isPlausibleCompletion(now, sixtySecondsLater, 120)).toBe(false);
  });
});
