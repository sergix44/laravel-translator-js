<script>
    import {trans, t, trans_choice, locale} from '../../src/svelte'
    import SvelteChild from './SvelteChild.svelte'
</script>

<h1 data-testid="title">{$trans('Welcome!')}</h1>
<p data-testid="greeting">{$t('Welcome, :name!', {name: 'John'})}</p>
<p data-testid="minutes">{$trans_choice('{1} :count minute ago|[2,*] :count minutes ago', 2)}</p>
<p data-testid="fallback">{$trans('Shared')}</p>
<input data-testid="input" placeholder={$trans('Welcome!')} />
<SvelteChild label={$trans('Welcome!')} />
<select data-testid="select" bind:value={$locale}>
    <option value="en">English</option>
    <option value="pt">Português</option>
</select>
